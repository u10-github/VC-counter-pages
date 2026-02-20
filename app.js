const CHART_COLORS = [
  "#38bdf8",
  "#f472b6",
  "#4ade80",
  "#fbbf24",
  "#a78bfa",
  "#fb7185",
  "#22d3ee",
  "#f97316",
  "#84cc16",
  "#e879f9",
];

const MOBILE_MEDIA_QUERY = "(max-width: 640px)";

function isMobileLayout() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function toHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function topText(items) {
  if (!items.length) return "データなし";
  return items
    .slice(0, 3)
    .map((item) => `${item.game} ${toHHMM(item.minutes)}`)
    .join(" / ");
}

function getTopGames(buckets, limit = 3) {
  const totals = new Map();
  buckets.forEach((bucket) => {
    bucket.items.forEach((item) => {
      totals.set(item.game, (totals.get(item.game) || 0) + item.minutes);
    });
  });
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([game]) => game);
}

function buildLineDatasets(buckets, games) {
  return games.map((game, idx) => ({
    label: game,
    data: buckets.map((bucket) => {
      const found = bucket.items.find((item) => item.game === game);
      return found ? found.minutes : 0;
    }),
    borderColor: CHART_COLORS[idx % CHART_COLORS.length],
    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
    tension: 0.25,
    pointRadius: 3,
  }));
}

function toShortDateLabel(dateText) {
  const d = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateText;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function toShortRangeLabel(startDate, endDate) {
  return `${toShortDateLabel(startDate)}〜${toShortDateLabel(endDate)}`;
}

function formatBucketLabel(bucket, mobile, compactDesktopLabel) {
  if (bucket.bucket_type === "day") {
    return mobile ? toShortDateLabel(bucket.start_date) : bucket.start_date;
  }

  if (mobile) {
    return toShortDateLabel(bucket.start_date);
  }

  if (compactDesktopLabel) {
    return toShortRangeLabel(bucket.start_date, bucket.end_date);
  }

  return `${bucket.start_date}〜${bucket.end_date}`;
}

function buildLegendItems(datasets) {
  return datasets
    .filter((dataset) => dataset && dataset.label)
    .map((dataset) => ({
      label: dataset.label,
      color: dataset.borderColor || dataset.backgroundColor || "#cbd5e1",
    }));
}

function getLegendToggleText(isVisible, label = "凡例") {
  return isVisible ? `${label}を隠す ▲` : `${label}を表示 ▼`;
}

function renderLegendList(chart, legendList) {
  const items = buildLegendItems(chart.data.datasets);
  legendList.innerHTML = "";

  items.forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "legend-list__item";

    const marker = document.createElement("span");
    marker.className = "legend-list__dot";
    marker.style.backgroundColor = item.color;

    const text = document.createElement("span");
    text.textContent = item.label;

    entry.append(marker, text);
    legendList.appendChild(entry);
  });
}

function buildChart(canvasId, buckets, title, options = {}) {
  if (!buckets.length) {
    return null;
  }

  const { compactDesktopLabel = false, desktopTickDivisor = 1 } = options;
  const mobile = isMobileLayout();
  const labels = buckets.map((bucket) => formatBucketLabel(bucket, mobile, compactDesktopLabel));
  const topGames = getTopGames(buckets, 10);
  const mobileStep = Math.max(1, Math.ceil(labels.length / 4));
  const desktopStep = Math.max(1, Math.ceil(labels.length / desktopTickDivisor));
  const xStep = mobile ? mobileStep : desktopStep;

  return new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels,
      datasets: buildLineDatasets(buckets, topGames),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: `${title}（minutes）`,
          color: "#94a3b8",
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            minRotation: mobile ? 0 : 35,
            maxRotation: mobile ? 0 : 35,
            callback: (_, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === labels.length - 1;
              if (isFirst || isLast || idx % xStep === 0) {
                return labels[idx];
              }
              return "";
            },
          },
          grid: {
            color: "rgba(148, 163, 184, 0.08)",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
          },
          grid: {
            color: "rgba(148, 163, 184, 0.08)",
          },
          title: { display: false },
        },
      },
    },
  });
}

function sumBucketMinutes(buckets) {
  return buckets.reduce(
    (all, bucket) => all + bucket.items.reduce((sum, it) => sum + it.minutes, 0),
    0,
  );
}

function getLatestDayDate(buckets) {
  const dayBuckets = buckets.filter((bucket) => bucket.bucket_type === "day");
  if (!dayBuckets.length) return null;
  return dayBuckets.reduce((latest, bucket) => {
    return bucket.end_date > latest ? bucket.end_date : latest;
  }, dayBuckets[0].end_date);
}

function filterBucketsBeforeDate(buckets, cutoffDate) {
  if (!cutoffDate) return buckets;
  return buckets.filter((bucket) => bucket.end_date < cutoffDate);
}

function attachLegendToggle(chart, chartBox) {
  if (!chart || !chartBox) return;

  const legendList = document.createElement("div");
  legendList.className = "legend-list";
  renderLegendList(chart, legendList);

  chartBox.insertAdjacentElement("afterend", legendList);
}

function appendBucket(list, bucket) {
  const div = document.createElement("div");
  div.className = "bucket";
  div.innerHTML = `
    <div><strong>${bucket.bucket_type}</strong> ${bucket.start_date} - ${bucket.end_date}</div>
    <div class="small">${topText(bucket.items)}</div>
  `;
  list.appendChild(div);
}

function renderBucketList(ts) {
  const list = document.getElementById("bucketList");
  list.innerHTML = "";

  const dataBuckets = ts.buckets.filter((bucket) => bucket.items.length > 0);
  const emptyBuckets = ts.buckets.filter((bucket) => bucket.items.length === 0);

  dataBuckets.forEach((bucket) => appendBucket(list, bucket));

  if (!emptyBuckets.length) return;

  const details = document.createElement("details");
  details.className = "bucket bucket--empty-group";

  const summary = document.createElement("summary");
  summary.className = "bucket-empty-summary";
  summary.textContent = `データなし ${emptyBuckets.length}件`;
  details.appendChild(summary);

  emptyBuckets.forEach((bucket) => {
    const inner = document.createElement("div");
    inner.className = "bucket bucket--empty";
    inner.innerHTML = `<div><strong>${bucket.bucket_type}</strong> ${bucket.start_date} - ${bucket.end_date}</div>`;
    details.appendChild(inner);
  });

  list.appendChild(details);
}

async function loadDashboard() {
  const [tsRes, metaRes] = await Promise.all([
    fetch("./data/timeseries_6m.json"),
    fetch("./data/meta.json"),
  ]);
  const ts = await tsRes.json();
  const meta = await metaRes.json();

  document.getElementById("meta").textContent = `更新: ${meta.generated_at} (${meta.timezone})`;

  const latestDayDate = getLatestDayDate(ts.buckets);
  const displayBuckets = filterBucketsBeforeDate(ts.buckets, latestDayDate);

  const recentBuckets = displayBuckets.filter((bucket) => bucket.bucket_type === "day");
  const longTermBuckets = displayBuckets;

  document.getElementById("recentTotal").textContent = `合計 ${toHHMM(sumBucketMinutes(recentBuckets))}`;
  document.getElementById("longTermTotal").textContent = `合計 ${toHHMM(sumBucketMinutes(longTermBuckets))}`;

  const recentChart = buildChart("recentChart", recentBuckets, "Top 10 games / 日次", {
    desktopTickDivisor: 7,
  });
  const longTermChart = buildChart("longTermChart", longTermBuckets, "Top 10 games / 1日目〜180日", {
    compactDesktopLabel: true,
    desktopTickDivisor: 9,
  });

  attachLegendToggle(recentChart, document.querySelector("#recentChart").closest(".chart-box"));
  attachLegendToggle(longTermChart, document.querySelector("#longTermChart").closest(".chart-box"));

  renderBucketList({ ...ts, buckets: displayBuckets });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  loadDashboard().catch((err) => {
    document.getElementById("meta").textContent = `読込失敗: ${err}`;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildLegendItems,
    getLegendToggleText,
  };
}

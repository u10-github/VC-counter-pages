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

function formatBucketLabel(bucket, mobile) {
  if (bucket.bucket_type === "day") {
    return mobile ? toShortDateLabel(bucket.start_date) : bucket.start_date;
  }

  if (mobile) {
    return toShortDateLabel(bucket.start_date);
  }

  return `${bucket.start_date}〜${bucket.end_date}`;
}

function buildChart(canvasId, buckets, title) {
  if (!buckets.length) {
    return null;
  }

  const mobile = isMobileLayout();
  const labels = buckets.map((bucket) => formatBucketLabel(bucket, mobile));
  const topGames = getTopGames(buckets, 10);
  const xStep = mobile ? Math.max(1, Math.ceil(labels.length / 4)) : 1;

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
          position: "bottom",
          display: !mobile,
          labels: {
            boxWidth: mobile ? 10 : 40,
            usePointStyle: true,
          },
        },
        title: {
          display: true,
          text: `${title}（minutes）`,
        },
      },
      scales: {
        x: {
          ticks: {
            minRotation: mobile ? 0 : 45,
            maxRotation: mobile ? 0 : 45,
            callback: (_, idx) => {
              const isLast = idx === labels.length - 1;
              if (!mobile || idx % xStep === 0 || isLast) {
                return labels[idx];
              }
              return "";
            },
          },
        },
        y: {
          beginAtZero: true,
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

function attachLegendToggle(chart, chartBox, label = "凡例") {
  if (!chart) return;

  const mobile = isMobileLayout();
  if (!mobile) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "legend-toggle";

  const renderText = () => {
    button.textContent = chart.options.plugins.legend.display
      ? `${label}を隠す ▲`
      : `${label}を表示 ▼`;
  };

  renderText();
  button.addEventListener("click", () => {
    chart.options.plugins.legend.display = !chart.options.plugins.legend.display;
    chart.update();
    renderText();
  });

  chartBox.insertAdjacentElement("afterend", button);
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

  const recentBuckets = ts.buckets.filter((bucket) => bucket.bucket_type === "day");
  const longTermBuckets = ts.buckets;

  document.getElementById("recentTotal").textContent = `合計 ${toHHMM(sumBucketMinutes(recentBuckets))}`;
  document.getElementById("longTermTotal").textContent = `合計 ${toHHMM(sumBucketMinutes(longTermBuckets))}`;

  const recentChart = buildChart("recentChart", recentBuckets, "Top 10 games / 日次");
  const longTermChart = buildChart("longTermChart", longTermBuckets, "Top 10 games / 1日目〜180日");

  attachLegendToggle(recentChart, document.querySelector("#recentChart").closest(".chart-box"), "凡例");
  attachLegendToggle(longTermChart, document.querySelector("#longTermChart").closest(".chart-box"), "凡例");

  renderBucketList(ts);
}

loadDashboard().catch((err) => {
  document.getElementById("meta").textContent = `読込失敗: ${err}`;
});

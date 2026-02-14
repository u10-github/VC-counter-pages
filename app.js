const CHART_COLORS = ["#38bdf8", "#f472b6", "#4ade80", "#fbbf24", "#a78bfa"];

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

function buildChart(canvasId, buckets, title) {
  if (!buckets.length) {
    return;
  }
  const labels = buckets.map((bucket) => {
    if (bucket.bucket_type === "day") return bucket.start_date;
    return `${bucket.start_date}〜${bucket.end_date}`;
  });
  const topGames = getTopGames(buckets, 3);

  new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels,
      datasets: buildLineDatasets(buckets, topGames),
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        title: {
          display: true,
          text: title,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "minutes" },
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

async function loadDashboard() {
  const [tsRes, metaRes] = await Promise.all([
    fetch("./data/timeseries_6m.json"),
    fetch("./data/meta.json"),
  ]);
  const ts = await tsRes.json();
  const meta = await metaRes.json();

  document.getElementById("meta").textContent = `更新: ${meta.generated_at} (${meta.timezone})`;

  const recentBuckets = ts.buckets.filter((bucket) => bucket.bucket_type === "day");
  const longTermBuckets = ts.buckets.filter((bucket) => bucket.bucket_type !== "day");

  document.getElementById("recentTotal").textContent = `合計 ${toHHMM(sumBucketMinutes(recentBuckets))}`;
  document.getElementById("longTermTotal").textContent = `合計 ${toHHMM(sumBucketMinutes(longTermBuckets))}`;

  buildChart("recentChart", recentBuckets, "Top 3 games / 日次");
  buildChart("longTermChart", longTermBuckets, "Top 3 games / 週次・月次");

  const list = document.getElementById("bucketList");
  ts.buckets.forEach((bucket) => {
    const div = document.createElement("div");
    div.className = "bucket";
    div.innerHTML = `
      <div><strong>${bucket.bucket_type}</strong> ${bucket.start_date} - ${bucket.end_date}</div>
      <div class="small">${topText(bucket.items)}</div>
    `;
    list.appendChild(div);
  });
}

loadDashboard().catch((err) => {
  document.getElementById("meta").textContent = `読込失敗: ${err}`;
});

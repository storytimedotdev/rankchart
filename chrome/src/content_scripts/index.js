const canvasId = "rankchart-canvas";

function renderChart(data) {
  let cvs = document.getElementById(canvasId);
  if (!cvs) {
    cvs = document.createElement("canvas");
    cvs.id = canvasId;
    cvs.classList.add("chart");

    const wrapper = document.createElement("div");
    wrapper.classList.add("chart");
    wrapper.appendChild(cvs);

    document.body.firstElementChild.prepend(wrapper);
  }
  const ctx = cvs.getContext("2d");

  new Chart(ctx, data);
}

function appendCurrentRank(chartData) {
  const athings = document.getElementsByClassName("athing");
  const rankMap = Array.from(athings).reduce(
    (memo, el, rank) => Object.assign({}, memo, { [el.id]: rank }),
    {}
  );
  chartData.data.datasets.forEach(ds => ds.data.push(rankMap[ds.label]));
  chartData.data.labels.push("now");
  return chartData;
}

function fetchData() {
  chrome.runtime.sendMessage({ action: "fetchData" }, res => {
    if (res.status === "success") {
      renderChart(appendCurrentRank(res.data));
    }
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action == "handlePageActionClick") {
    fetchData();
  }
});

chrome.extension.sendMessage({ message: "activate_icon" });

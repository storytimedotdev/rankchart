const canvasId = "rankchart-canvas";

let chartObj;

function renderChart(data) {
  let cvs = document.getElementById(canvasId);
  if (!cvs) {
    cvs = document.createElement("canvas");
    cvs.id = canvasId;
    cvs.classList.add("chart");

    const cvsWrapper = document.createElement("div");
    cvsWrapper.classList.add("chart");
    cvsWrapper.appendChild(cvs);

    const wrapper = document.createElement("div");
    wrapper.appendChild(cvsWrapper);

    const imgEl = document.createElement("img");

    const aTag = document.createElement("a");
    aTag.setAttribute("href", "https://storytime.dev?ref=rank_chart");
    aTag.setAttribute("target", "_blank");
    aTag.appendChild(imgEl);

    const promo = document
      .createElement("i")
      .appendChild(document.createTextNode("From the makers of"));
    const promoWrapper = document.createElement("div");
    promoWrapper.appendChild(promo);

    wrapper.appendChild(promoWrapper);
    wrapper.appendChild(aTag);

    document.body.firstElementChild.prepend(wrapper);
    imgEl.src = chrome.extension.getURL("images/storytime.png");
  }
  const ctx = cvs.getContext("2d");

  chartObj = new Chart(ctx, data);
}

function highlight(label, hilight) {
  console.log(label, hilight);
  if (!chartObj) {
    return;
  }
  const dataset = chartObj.data.datasets.forEach(ds => {
    if (ds.label === label) {
      ds.borderColor = "#ff6600";
    } else {
      ds.borderColor = "#dae1e7";
    }
  });
  chartObj.update();
}

function handleMouseEvent(ev) {
  const el = ev.target;
  if (el.tagName === "TD" && el.classList.contains("title")) {
    const row = el.closest(".athing");
    if (row) {
      highlight(row.id, ev.type === "mouseover");
    }
  }
}

function setupHoverEvents() {
  document.removeEventListener("mouseover", handleMouseEvent);
  document.addEventListener("mouseover", handleMouseEvent);
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
      setupHoverEvents();
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

const GRAPH_DATA_URL =
  "https://rankchart.s3.us-east-2.amazonaws.com/latest.json";

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "activate_icon") {
    chrome.pageAction.show(sender.tab.id);
  }
});

chrome.pageAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendMessage(tab.id, { action: "handlePageActionClick" });
});

const formatTime = ts =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const stortByUpdated = lastIdx => (a, b) => {
  const aRank = a.data[lastIdx];
  const bRank = b.data[lastIdx];
  if (a.data[lastIdx] > b.data[lastIdx]) {
    return 1;
  } else if (a.data[lastIdx] < b.data[lastIdx]) {
    return -1;
  }
  return 0;
};

const palette = [
  "#4477AA",
  "#66CCEE",
  "#228833",
  "#CCBB44",
  "#EE6677",
  "#AA3377",
  "#BBBBBB",
  "#DDAA33",
  "#BB5566",
  "#004488",
  "#000000",
  "#EE7733",
  "#EE3377",
  "#FFAABB",
  "#800000",
  "#AAAA00",
  "#808000",
  "#99DDFF",
  "#000080",
  "#808080",
  "#77AADD",
  "#44AA99"
];

const getColor = idx => palette[idx % palette.length];

const formatDataSets = (ds, idx) =>
  Object.assign(
    {
      fill: false,
      borderWidth: 2,
      borderColor: getColor(idx),
      pointRadius: 0,
      pointHitRadius: 5
    },
    ds
  );

function convert2chartData(data) {
  const { datasets, intervals } = data;
  return {
    type: "line",
    data: {
      labels: intervals.map(formatTime),
      datasets: datasets
        .sort(stortByUpdated(intervals.length - 1))
        .slice(0, 30)
        .map(formatDataSets)
    },
    options: {
      legend: { display: false },
      maintainAspectRatio: false,
      responsive: true,
      layout: {
        padding: {
          top: 45,
          right: 0
        }
      },
      scales: {
        yAxes: [
          {
            gridLines: {
              display: false
            },
            ticks: {
              beginAtZero: true,
              reverse: true,
              max: 29,
              display: false
            }
          }
        ],
        xAxes: [
          {
            gridLines: {
              display: false
            }
          }
        ]
      }
    }
  };
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action == "fetchData") {
    fetch(GRAPH_DATA_URL)
      .then(response => response.json())
      .then(data =>
        sendResponse({ status: "success", data: convert2chartData(data) })
      )
      .catch(error => sendResponse({ status: "error", error: error.message }));
    return true; // Will respond asynchronously.
  }
});

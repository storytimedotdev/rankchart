require("dotenv/config");
const Mongoose = require("mongoose");
const fetch = require("isomorphic-unfetch");
const AWS = require("aws-sdk");

const S3 = new AWS.S3();
const Schema = Mongoose.Schema;

const ArticleSchema = new Schema({
  _id: String,
  created: Date,
  lastUpdated: Date,

  updated: [Date],
  rank: [Number]
});

const ArticleModel = Mongoose.model("Article", ArticleSchema);

const HN_ENDPOINT = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_PREFIX = "hacker-news";

const getId = id => `${HN_PREFIX}-${id}`;
const parseId = id => id.split("-").pop();

async function updateRank() {
  await Mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true
  });
  console.log("[MongoDB] connected.");
  const res = await fetch(HN_ENDPOINT);
  const data = await res.json();

  if (!data || !Array.isArray(data)) {
    throw Error("No data");
  }
  const top50 = data.slice(0, 50).map(getId);
  console.log("Got data: ", top50.length);

  const bulk = ArticleModel.collection.initializeUnorderedBulkOp();
  const now = new Date();
  top50.forEach((_id, rank) => {
    bulk
      .find({ _id })
      .upsert()
      .update({
        $set: { _id, lastUpdated: now },
        $push: { rank, updated: now },
        $setOnInsert: { created: now }
      });
  });

  try {
    await bulk.execute();
  } catch (err) {
    console.error(JSON.stringify(err.writeErrors[0], null, " "));
  }
}

function map2Intervals(mdl, intervals) {
  const { updated, rank } = mdl;
  const ret = [];
  updated.forEach((ts, i) => {
    const idx = intervals.indexOf(ts.getTime());
    ret[idx] = rank[i];
  });
  return ret;
}

async function upload2S3() {
  const past = new Date();
  past.setHours(past.getHours() - 6);

  const articleModels = await ArticleModel.find(
    {
      lastUpdated: { $gt: past }
    },
    null,
    { sort: { lastUpdated: -1 } }
  );

  const tsSet = new Set();
  articleModels.forEach(mdl =>
    mdl.updated.forEach(ts => ts > past && tsSet.add(ts.getTime()))
  );
  const intervals = Array.from(tsSet).sort();
  const datasets = articleModels.map(mdl => {
    return {
      label: parseId(mdl._id),
      lastUpdated: mdl.lastUpdated.getTime(),
      data: map2Intervals(mdl, intervals)
    };
  });
  await Mongoose.disconnect();

  await S3.putObject({
    Bucket: "rankchart",
    Key: "latest.json",
    ContentType: "application/json",
    Body: JSON.stringify({ datasets, intervals })
  }).promise();
}

exports.handler = async function(event) {
  // TODO implement
  try {
    await updateRank();
    await upload2S3();
    return {
      statusCode: 200,
      body: JSON.stringify("Updated!")
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err.message)
    };
  }
};

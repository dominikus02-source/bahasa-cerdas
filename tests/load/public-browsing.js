// k6 load test — Public Browsing (artikel homepage, artikel list, artikel detail)
// Usage: k6 run tests/load/public-browsing.js
// Options: k6 run --vus 50 --duration 3m tests/load/public-browsing.js

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://bahasacerdas.com";
const STAGES = __ENV.STAGES || "50,100,300";

const errorRate = new Rate("errors");
const artikelListDuration = new Trend("artikel_list_duration");
const artikelDetailDuration = new Trend("artikel_detail_duration");
const homepageDuration = new Trend("homepage_duration");

export const options = {
  stages: parseStages(STAGES),
  thresholds: {
    errors: ["rate<0.02"], // error rate < 2%
    http_req_duration: ["p(95)<5000"], // p95 < 5s
  },
};

function parseStages(stages) {
  const parts = stages.split(",").map(Number);
  return [
    { duration: "1m", target: parts[0] || 50 },
    { duration: "2m", target: parts[1] || 100 },
    { duration: "1m", target: parts[2] || 300 },
  ];
}

export default function () {
  group("Homepage", function () {
    const res = http.get(`${BASE_URL}/`);
    const ok = check(res, {
      "homepage status 200": (r) => r.status === 200,
    });
    errorRate.add(!ok);
    homepageDuration.add(res.timings.duration);
    sleep(1);
  });

  group("Artikel List", function () {
    const res = http.get(`${BASE_URL}/artikel`);
    const ok = check(res, {
      "artikel list status 200": (r) => r.status === 200,
      "artikel list has content": (r) => r.body.length > 500,
    });
    errorRate.add(!ok);
    artikelListDuration.add(res.timings.duration);

    // Fetch API endpoint directly (what the client-side page uses)
    const apiRes = http.get(`${BASE_URL}/api/artikel?page=1&limit=12`);
    const apiOk = check(apiRes, {
      "artikel API status 200": (r) => r.status === 200,
      "artikel API has articles": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.articles && data.articles.length > 0;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!apiOk);
    artikelListDuration.add(apiRes.timings.duration);
    sleep(1);
  });

  group("Artikel Detail", function () {
    // Fetch first 3 articles from API to get slugs
    const listRes = http.get(`${BASE_URL}/api/artikel?page=1&limit=3`);
    if (listRes.status === 200) {
      try {
        const data = JSON.parse(listRes.body);
        if (data.articles && data.articles.length > 0) {
          const slug = data.articles[0].slug;
          const res = http.get(`${BASE_URL}/artikel/${slug}`);
          const ok = check(res, {
            "artikel detail status 200": (r) => r.status === 200,
          });
          errorRate.add(!ok);
          artikelDetailDuration.add(res.timings.duration);
        }
      } catch {
        // skip detail if parsing fails
      }
    }
    sleep(2);
  });
}

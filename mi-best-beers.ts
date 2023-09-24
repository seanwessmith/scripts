import * as cheerio from "cheerio";
import fs from "fs";

const main = async () => {
  const results: any = [];
  try {
    const siteDomain = "https://www.beeradvocate.com";
    const linkRes = await fetch(`${siteDomain}/beer/top-rated/`);
    const data = await linkRes.text();
    let $ = cheerio.load(data);
    const links: string[] = [];
    $(".hr_bottom_light a").each((idx, ref) => {
      const elem = $(ref).attr("href");
      links.push(elem!);
    });
    for (let i = 0; i < links.length; i++) {
      if (links[i].includes("profile")) {
        const beerRes = await fetch(`${siteDomain}${links[i]}`);
        const data = await beerRes.text();
        $ = cheerio.load(data);
        let isMichigan = false;
        $("dl.beerstats dd").each((idx, ref) => {
          if (idx === 1) {
            const state = $(ref).text();
            if (state.includes("Michigan")) {
              isMichigan = true;
            }
          }
        });
        if (isMichigan) {
          let title = $("h1").text();
          let brewery = $("h1 span").text();
          let style = $($("dl.beerstats dd b")[1]).text();
          let score = $($("dd.beerstats b")[3]).text();
          let avg = $($("dd.beerstats span")[2]).text();
          let avgDev = $($("dd.beerstats span")[3]).text();
          let reviews = $($("dd.beerstats span")[4]).text();
          let ratings = $($("dd.beerstats span")[5]).text();
          let status = $($("dd.beerstats span")[7]).text();
          let added = $($("dd.beerstats span")[8]).text().replace("\n", "");
          if (
            !brewery ||
            !style ||
            !score ||
            !avg ||
            !avgDev ||
            !reviews ||
            !ratings ||
            !status ||
            !added
          ) {
            console.log("missing data", i, `${siteDomain}${links[i]}`);
            throw Error("missing data");
            // const statDivs = $('#stats_box div');
            // const beerStats = statDivs[0];
            // const placeStats = statDivs[0];
            // avg = $($(beerStats).find("dd span")[0]).text();
            // ratings = $($(beerStats).find("dt span")[2]).text();

            // avg = $($(beerStats).find("dd span")[0]).text();
            // ratings = $($(beerStats).find("dt span")[2]).text();
          }
          results.push({
            link: `${siteDomain}${links[i]}`,
            name: title.split(brewery)[0],
            brewery,
            style,
            score,
            avg,
            avgDev,
            reviews,
            ratings,
            status,
            added,
          });
          console.log(
            "logged",
            i,
            "of ",
            links.length,
            `${siteDomain}${links[i]}`
          );
        } else {
          console.log("skipped", i, "of ", links.length);
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
  fs.writeFileSync("./mi-best-beers2.json", JSON.stringify(results));
};

main();

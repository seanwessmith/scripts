import { load } from "cheerio";
import type {
  CourtAvailability,
  ReservationSystem,
  TennisCourt,
} from "./types";

async function getter(): Promise<TennisCourt[]> {
  // this URL contains <li> elements with <a> elements that contain links to the tennis courts
  const reservableCourtsUrl =
    "https://sfrecpark.org/1446/Reservable-Tennis-Courts";

  const linksHref = await fetch(reservableCourtsUrl);
  const $ = load(await linksHref.text());
  const links = $(".widgetBody li a")
    .toArray()
    .map((el) => $(el).attr("href"))
    .filter((link) => link?.includes("/sfrecpark"));
  const linksUnique = [...new Set(links)];
  console.log(linksUnique.length);

  const courts: TennisCourt[] = [];
  const responses = await Promise.all(
    linksUnique.map(async (url) => {
      const response = await fetch(url!);
      return response.text();
    })
  );
  for (const page of responses) {
    // if not valid URL, skip
    const $page = load(page);
    const scriptContent = $page("#__NEXT_DATA__").html();
    if (!scriptContent) {
      continue;
    }
    const jsonData = JSON.parse(scriptContent!);
    const locationId =
      jsonData.props.pageProps.dehydratedState.queries[0].state.data.location
        .id;
    console.log(locationId);
    const date = new Date();
    const startDate = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    const page2 = await fetch(
      `https://api.rec.us/v1/locations/${locationId}/schedule?startDate=${startDate}`
    );
    const schedule = (await page2.json()) as ReservationSystem;
    const formattedDate =
      date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0");
    console.log(formattedDate);
    const times = schedule.dates[formattedDate].map((court) =>
      Object.keys(court.schedule)
        .map((time) => {
          const reservation = court.schedule[time];
          if (reservation.referenceType === "RESERVABLE") {
            return time;
          }
        })
        .filter(Boolean)
    ) as string[][];
    console.log(
      jsonData.props.pageProps.dehydratedState.queries[0].state.data.location
        .name
    );
    for (const time of times) {
      courts.push({
        name: jsonData.props.pageProps.dehydratedState.queries[0].state.data
          .location.name,
        availability: time.map((t) =>
          t.split("-")
        ) as unknown as CourtAvailability[],
        // url: url as string,
      });
    }
  }
  return courts;
}
export { getter };

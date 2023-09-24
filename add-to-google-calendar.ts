import { google, calendar_v3 } from "googleapis";
import { DateTime } from "luxon";

// Google calendar script to take in list of events and add them to the calendar
// ChatGPT link https://chat.openai.com/share/be3e00f7-7510-4d5c-aaae-e0d216cb8e91

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

// Set access and refresh tokens
oauth2Client.setCredentials({
  access_token: process.env.GOOGLE_CALENDAR_ACCESS_TOKEN,
  refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

const eventsData = [
  "9/24/2023",
  "SDS Michael Hall	Not Played",
  "10/29/2023",
  "SDC Parthiv Shah	Not Played",
  "10/1/2023",
  "SDE Robert Braunschweig	Not Played",
  "11/5/2023",
  "SDS Marco Mendez	Not Played",
  "10/8/2023",
  "PL William Carey	Not Played",
  "11/12/2023",
  "Open	Not Played",
  "10/15/2023",
  "PL Paul Milbury	Not Played",
  "11/19/2023",
  "SDE- Henry Cohn-Geltner	Not Played",
  "10/22/2023",
  "SDSE James Bell-Torres	Not Played",
];

const events = eventsData.reduce((acc, line, index, array) => {
  if (index % 2 === 0) {
    const dateMatch = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(line);
    if (!dateMatch) {
      console.log(`Skipping invalid date: ${line}`);
      return acc;
    }

    const [title, status] = array[index + 1].split("\t");
    acc.push({
      date: line,
      title,
      status,
    });
  }
  return acc;
}, [] as Array<{ date: string; title: string; status: string }>);

(async () => {
  for (const { date, title, status } of events) {
    console.log(date);
    const startDateTime = DateTime.fromFormat(date, "M/d/yyyy").toISO();
    const endDateTime = DateTime.fromFormat(date, "M/d/yyyy").toISO();
    const event: calendar_v3.Schema$Event = {
      summary: `${title} (${status})`,
      start: { dateTime: startDateTime, timeZone: "America/Los_Angeles" },
      end: { dateTime: endDateTime, timeZone: "America/Los_Angeles" },
    };

    try {
      console.log(`Adding event ${JSON.stringify(event)}`);
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });
      console.log(`Event ${response.data.summary} added successfully.`);
    } catch (error: any) {
      console.log(`Failed to add event: ${error.message}`);
    }
  }
})();

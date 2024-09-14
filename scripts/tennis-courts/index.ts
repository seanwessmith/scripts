import { program } from "commander";
import { getter } from "./getter";
import type { TennisCourt } from "./types";

class TennisCourtChecker {
  private courts: TennisCourt[];

  constructor(courts: TennisCourt[]) {
    this.courts = courts;
  }

  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private isAvailable(
    court: TennisCourt,
    startTime: Date,
    endTime: Date
  ): boolean {
    return court.availability.some((courtSlots) =>
      courtSlots.some(([slotStart, slotEnd]) => {
        const slotStartTime = this.parseTime(slotStart);
        const slotEndTime = this.parseTime(slotEnd);
        return startTime >= slotStartTime && endTime <= slotEndTime;
      })
    );
  }

  checkAvailability(startTimeStr: string, endTimeStr: string): void {
    const startTime = this.parseTime(startTimeStr);
    const endTime = this.parseTime(endTimeStr);

    console.log(`Checking availability for ${startTimeStr} - ${endTimeStr}:`);

    this.courts.forEach((court) => {
      if (this.isAvailable(court, startTime, endTime)) {
        console.log(`- ${court.name} is available.`);
      } else {
        console.log(
          `- ${court.name} is not available for the requested time slot.`
        );
      }
    });
  }
}

const courts = await getter();
const checker = new TennisCourtChecker(courts);

program
  .version("1.0.0")
  .description("Check tennis court availability")
  .argument("<startTime>", "Start time in HH:MM format")
  .argument("<endTime>", "End time in HH:MM format")
  .action((startTime: string, endTime: string) => {
    if (!startTime || !endTime) {
      console.log("Please provide start and end times.");
      return;
    }
    checker.checkAvailability(startTime, endTime);
  });

program.parse(process.argv);

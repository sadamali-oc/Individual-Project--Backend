const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

exports.convertToTimestamp = (eventDateString, timeString) => {
  const eventDate = dayjs(eventDateString);
  const time = dayjs(timeString, ["h:mm A", "h:mm a"]);

  if (!eventDate.isValid() || !time.isValid()) {
    throw new Error("Invalid date/time format");
  }

  return eventDate
    .set("hour", time.hour())
    .set("minute", time.minute())
    .set("second", 0)
    .format("YYYY-MM-DD HH:mm:ss");
};

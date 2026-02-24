import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"; // import "dayjs/locale/zh-cn";
dayjs.extend(utc);

export const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "未知时间";
  return dayjs(dateStr).local().format("YYYY-MM-DD HH:mm:ss");
};

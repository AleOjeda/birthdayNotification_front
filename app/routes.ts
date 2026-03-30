import { index, route, layout } from "@react-router/dev/routes";

export default [
  // 👉 root "/" redirige a dashboard
  index("routes/redirect.tsx"),

  layout("routes/layouts/RootLayout.tsx", [
    route("dashboard", "routes/dashboard/BirthdayDashboard.jsx"),
    route("register", "routes/registerBirthday/RegisterBirthday.jsx"),
    route("list", "routes/birthdayList/BirthdayList.jsx"),
    route("calendar", "routes/calendar/MonthlyCalendar.jsx"),
  ]),
];

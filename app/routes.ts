import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";
// import  WhatsappQR from "../components/whatsappQR";

export default [
    layout (
        // "routes/home/home.tsx",[
        "routes/layouts/RootLayout.tsx",[
            // index("routes/home/home.tsx"),
            index("routes/registerBirthday/RegisterBirthday.jsx", {
                id: "register-birthday-index"
              }),
            route("register", "routes/registerBirthday/RegisterBirthday.jsx", {
                id: "register-birthday-route"
              }),
            route("list", "routes/birthdayList/BirthdayList.jsx"),
            route("edit/:id", "routes/editBirthday/EditBirthday.jsx"),
            route("QR", "routes/components/whatsappQR.tsx"),
            // route("register", "routes/home/home.tsx"),
        ]
    ),
    // route("about", "routes/home/home.tsx")
] satisfies RouteConfig;

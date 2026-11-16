import { request, ApiError, API_URL } from "./http";

export { ApiError, API_URL };

export const getCustomers = () => request("/api/customers");

export const createCustomer = (payload) =>
  request("/api/customers", { method: "POST", body: payload });

export const updateCustomer = (id, payload) =>
  request(`/api/customers/${encodeURIComponent(id)}`, { method: "PUT", body: payload });

export const deleteCustomer = (id) =>
  request(`/api/customers/${encodeURIComponent(id)}`, { method: "DELETE" });

export const getBirthdaysToday = () => request("/api/customers/birthdays/today");

export const getBirthdaysWeek = () => request("/api/customers/birthdays/week");

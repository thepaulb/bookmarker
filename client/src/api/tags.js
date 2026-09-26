import { request } from "./http";

// All of the user's tags as [{ name, count }], A–Z.
export function getTags() {
  return request("/tags");
}

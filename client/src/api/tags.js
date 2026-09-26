import { request } from "./http";

// All of the user's tags as [{ name, count }], A–Z.
export function getTags() {
  return request("/tags");
}

// Pairs of tags saved on the same bookmark as [{ a, b, count }],
// strongest first.
export function getTagLinks() {
  return request("/tags/links");
}

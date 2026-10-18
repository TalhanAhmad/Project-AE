// A client returned by our future local API, not an unchecked request body.
export type Client = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  notes?: string;
  // ISO date-time strings are easy to send as JSON.
  createdAt: string;
  updatedAt: string;
};

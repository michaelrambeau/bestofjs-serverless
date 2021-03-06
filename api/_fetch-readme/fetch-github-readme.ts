import fetch from "node-fetch";
import debugModule from "debug";

import { processHtml } from "./process-html";

const debug = debugModule("api");

export async function fetchReadme({ credentials, repo, branch = "master" }) {
  // Define an helper to send the error message
  const sendError = (message) => {
    throw new Error(message);
  };

  // Check the input
  if (!repo) return sendError("No `repo` parameter");

  // Check if credentials are provided
  const { username, client_id, client_secret } = credentials;
  if (!username) return sendError("No Github credentials `username`");
  if (!client_id) return sendError("No Github credentials `client_id`");
  if (!client_secret) return sendError("No Github credentials `client_secret`");
  const options = { credentials, branch };
  try {
    debug("Fetching", repo);
    const html = await githubRequest(repo, "/readme", options);
    try {
      const readme = processHtml({ html, repo, branch });
      return readme;
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
      // Return HTML code non formatted if an error occurred
      return html;
    }
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    return `Unable to fetch README.md for ${repo} repository!`;
  }
}

// Generic function to make a Github request for a given repository
// Parameters:
// - repo: full URL of the Github repository
// - path (optional): added to the repository (ex: '/readme')
async function githubRequest(repo: string, path: string, options) {
  const {
    credentials: { username, client_id, client_secret },
  } = options;
  const url = `https://api.github.com/repos/${repo}${path}`;
  const requestOptions = {
    headers: {
      "User-Agent": username,
      Authorization: `Basic ${encodeCredentials(client_id, client_secret)}`,
      Accept: "application/vnd.github.VERSION.html",
    },
  };

  const response = await fetch(url, requestOptions);
  debug("Remaining API calls", response.headers.get("x-ratelimit-remaining")); // auth credentials are needed to avoid the default limit (60)
  return response.text();
}

function encodeCredentials(username: string, password: string): string {
  return Buffer.from(username + ":" + password).toString("base64");
}

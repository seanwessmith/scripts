import axios from "axios";
import express from "express";
import open from "open";
import path from "path";
import autocomplete from "inquirer-autocomplete-standalone";

const tokenFilePath = path.join(__dirname, ".spotify_tokens.json");

async function storeTokens(tokens: Tokens) {
  await Bun.write(tokenFilePath, JSON.stringify(tokens, null, 2));
}

async function getStoredTokens(): Promise<Tokens | null> {
  try {
    const data = await Bun.file(tokenFilePath).json();
    return data as Tokens;
  } catch {
    return null;
  }
}

const clientId = "42f8966f8ee848dabc27fde74d3e996f";
const clientSecret = "4a3f5898f29b49c78ed9f276c4fe169e";
const redirectUri = "http://localhost:3000/auth/callback";
const scopes = [
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "playlist-read-collaborative",
];

async function refreshToken(refreshToken: string) {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const newTokens = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token || refreshToken, // Use the old refresh token if a new one is not provided
      scope: response.data.scope,
      timestamp: Date.now(),
    };

    await storeTokens(newTokens);
    return newTokens;
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}

async function getAccessToken(): Promise<string> {
  let tokens = await getStoredTokens();

  if (tokens) {
    const now = new Date();
    const expirationTime = new Date(
      tokens.timestamp + tokens.expires_in * 1000
    );

    if (now < expirationTime) {
      return tokens.access_token;
    } else {
      console.log("Token expired, refreshing...", now, expirationTime);
      tokens = await refreshToken(tokens.refresh_token);
      return tokens.access_token;
    }
  } else {
    throw new Error("No valid tokens available.");
  }
}

async function authorize() {
  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams(
    {
      response_type: "code",
      client_id: clientId,
      scope: scopes.join(" "),
      redirect_uri: redirectUri,
    }
  )}`;

  open(authUrl);

  const app = express();

  app.get("/auth/callback", async (req, res) => {
    const code = req.query.code as string;
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const tokens = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token,
      scope: response.data.scope,
      timestamp: Date.now(),
    };

    await storeTokens(tokens);
    res.send(
      "Authorization successful! You can close this tab and return to the console."
    );
  });

  app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
}

async function main() {
  try {
    const accessToken = await getAccessToken();

    const user = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let playlists: {
      name: string;
      description: string;
      tracks: { href: string };
    }[] = [];
    let next = `https://api.spotify.com/v1/users/${user.data.id}/playlists?limit=50&offset=0`;
    while (next) {
      const response = await axios.get(next, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      next = response.data.next;
      //   console.log("playlists", response.data.items);
      playlists = [...playlists, ...response.data.items];
    }

    const playlistsSorted = playlists.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    console.log(`Found ${playlistsSorted.length} playlists:`);
    const selectedPlaylistHref = await autocomplete({
      message: "Search for a playlist:",
      pageSize: 20,
      source: async (input) => {
        return playlistsSorted
          .map((playlist) => {
            return {
              name: playlist.name,
              value: playlist.tracks.href,
              description: playlist.description,
            };
          })
          .filter((playlist) =>
            input
              ? playlist.name.toLowerCase().includes(input.toLowerCase())
              : true
          );
      },
    });

    console.log("Selected playlist:", selectedPlaylistHref);

    const tracksResponse = await axios.get(selectedPlaylistHref, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log(
      JSON.stringify(
        tracksResponse.data.items.map(
          ({
            track,
          }: {
            track: { name: string; artists: { name: string }[] };
          }) =>
            `${track.name} ${track.artists
              .map((a) => a.name)
              .join(", ")}`.replace(/"/g, '\\"')
        )
      )
    );
  } catch (error) {
    console.log("No valid tokens available, starting authorization...", error);
    await authorize();
  }
}

main();

// types
interface Tokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  timestamp: number;
}

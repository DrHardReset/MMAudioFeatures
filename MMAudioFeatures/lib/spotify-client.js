'use strict';

class SpotifyClient {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
        this.tokenExpiresAt = 0;
    }

    async authenticate() {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiresAt) {
            return { access_token: this.accessToken };
        }

        const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiresAt = now + data.expires_in * 1000;
            return data;
        } catch (error) {
            throw new Error(`Spotify authentication error: ${error.message}`);
        }
    }

    async searchTracks(artist, track, album = null, options = {}) {
        if (!this.accessToken) {
            await this.authenticate();
        }

        let query = '';
        if (artist && track) {
            query = `artist:${artist} track:${track}`;
        } else if (artist) {
            query = `artist:${artist}`;
        } else if (track) {
            query = `track:${track}`;
        } else {
            throw new Error('Artist or track must be specified.');
        }

        if (album) {
            query += ` album:${album}`;
        }

        const limit = options.limit || 20;
        const market = options.market || 'DE';

        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=${market}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Spotify search error: ${error.message}`);
        }
    }

    async searchByQuery(query, options = {}) {
        if (!this.accessToken) {
            await this.authenticate();
        }

        const limit = options.limit || 20;
        const market = options.market || 'DE';

        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=${market}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Spotify search error: ${error.message}`);
        }
    }
}

// For MediaMonkey compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpotifyClient };
} else {
    // Browser/MediaMonkey environment
    window.SpotifyClient = SpotifyClient;
}

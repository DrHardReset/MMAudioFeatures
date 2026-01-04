'use strict';

const { SpotifyClient } = require('../../lib/spotify-client');

// Mock fetch globally
global.fetch = jest.fn();
global.btoa = jest.fn();

describe('SpotifyClient', () => {
    let spotifyClient;

    beforeEach(() => {
        spotifyClient = new SpotifyClient('test-client-id', 'test-client-secret');
        jest.clearAllMocks();
        global.btoa.mockReturnValue('dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0');
    });

    describe('constructor', () => {
        test('should initialize with client credentials', () => {
            expect(spotifyClient.clientId).toBe('test-client-id');
            expect(spotifyClient.clientSecret).toBe('test-client-secret');
            expect(spotifyClient.accessToken).toBeNull();
        });
    });

    describe('authenticate', () => {
        test('should successfully authenticate and set access token', async () => {
            const mockTokenResponse = {
                access_token: 'test-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTokenResponse)
            });

            const result = await spotifyClient.authenticate();

            expect(global.fetch).toHaveBeenCalledWith('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });

            expect(spotifyClient.accessToken).toBe('test-access-token');
            expect(result).toEqual(mockTokenResponse);
        });

        test('should return existing token if already authenticated', async () => {
            spotifyClient.accessToken = 'existing-token';
            spotifyClient.tokenExpiresAt = Date.now() + 3600000;

            const result = await spotifyClient.authenticate();

            expect(global.fetch).not.toHaveBeenCalled();
            expect(result).toEqual({ access_token: 'existing-token' });
        });

        test('should reject on authentication error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            await expect(spotifyClient.authenticate()).rejects.toThrow('Authentication failed: 401');
        });

        test('should reject on network error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(spotifyClient.authenticate()).rejects.toThrow('Spotify authentication error: Network error');
        });
    });

    describe('searchTracks', () => {
        beforeEach(() => {
            spotifyClient.accessToken = 'test-access-token';
        });

        test('should authenticate if no access token', async () => {
            spotifyClient.accessToken = null;

            const mockTokenResponse = {
                access_token: 'new-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            const mockSearchResponse = {
                tracks: { items: [] }
            };

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockTokenResponse)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockSearchResponse)
                });

            await spotifyClient.searchTracks('artist', 'track');

            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(spotifyClient.accessToken).toBe('new-access-token');
        });

        test('should build correct query for artist and track', async () => {
            const mockSearchResponse = {
                tracks: {
                    items: [
                        {
                            id: 'track-id',
                            name: 'Test Track',
                            artists: [{ name: 'Test Artist' }]
                        }
                    ]
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            const result = await spotifyClient.searchTracks('Test Artist', 'Test Track');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3ATest%20Artist%20track%3ATest%20Track&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );

            expect(result).toEqual(mockSearchResponse);
        });

        test('should include album in query when provided', async () => {
            const mockSearchResponse = { tracks: { items: [] } };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            await spotifyClient.searchTracks('Artist', 'Track', 'Test Album');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3AArtist%20track%3ATrack%20album%3ATest%20Album&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );
        });

        test('should handle search with only artist', async () => {
            const mockSearchResponse = { tracks: { items: [] } };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            await spotifyClient.searchTracks('Test Artist', '');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3ATest%20Artist&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );
        });

        test('should handle search with only track', async () => {
            const mockSearchResponse = { tracks: { items: [] } };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            await spotifyClient.searchTracks('', 'Test Track');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=track%3ATest%20Track&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );
        });

        test('should throw error when neither artist nor track provided', async () => {
            await expect(spotifyClient.searchTracks('', '')).rejects.toThrow('Artist or track must be specified');
        });

        test('should reject on search error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400
            });

            await expect(spotifyClient.searchTracks('Artist', 'Track')).rejects.toThrow('Search failed: 400');
        });

        test('should respect custom options', async () => {
            const mockSearchResponse = { tracks: { items: [] } };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            await spotifyClient.searchTracks('Artist', 'Track', null, { limit: 10, market: 'US' });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3AArtist%20track%3ATrack&type=track&limit=10&market=US',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );
        });
    });

    describe('searchByQuery', () => {
        beforeEach(() => {
            spotifyClient.accessToken = 'test-access-token';
        });

        test('should authenticate if no access token', async () => {
            spotifyClient.accessToken = null;

            const mockTokenResponse = {
                access_token: 'new-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            const mockSearchResponse = {
                tracks: { items: [] }
            };

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockTokenResponse)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockSearchResponse)
                });

            await spotifyClient.searchByQuery('test query');

            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(spotifyClient.accessToken).toBe('new-access-token');
        });

        test('should perform free text search', async () => {
            const mockSearchResponse = { tracks: { items: [] } };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            await spotifyClient.searchByQuery('daft punk get lucky');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=daft%20punk%20get%20lucky&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );
        });

        test('should respect custom options', async () => {
            const mockSearchResponse = { tracks: { items: [] } };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            await spotifyClient.searchByQuery('query', { limit: 5, market: 'GB' });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=query&type=track&limit=5&market=GB',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );
        });

        test('should reject on search error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 429
            });

            await expect(spotifyClient.searchByQuery('query')).rejects.toThrow('Search failed: 429');
        });

        afterAll(() => {
            console.log('🏁 Spotify Client Test completed');
        });
    });
});

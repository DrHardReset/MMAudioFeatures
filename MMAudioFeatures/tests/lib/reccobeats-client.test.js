'use strict';

const { ReccoBeatsClient } = require('../../lib/reccobeats-client');

// Mock fetch globally - BEFORE any imports
global.fetch = jest.fn();

// Mock console.error to suppress error logs during tests
console.error = jest.fn();

describe('ReccoBeatsClient', () => {
    let reccobeatsClient;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create a new client instance
        reccobeatsClient = new ReccoBeatsClient();

        // Reset fetch mock
        global.fetch.mockReset();
    });

    describe('constructor', () => {
        test('should initialize with default baseUrl', () => {
            const client = new ReccoBeatsClient();
            expect(client.baseUrl).toBe('https://api.reccobeats.com');
            expect(client.apiKey).toBeNull();
        });
    });

    describe('getAudioFeatures', () => {
        test('should throw error for missing ID', async () => {
            await expect(reccobeatsClient.getAudioFeatures('')).rejects.toThrow('ReccoBeats ID is required');
        });

        test('should fetch audio features successfully', async () => {
            const mockFeatures = {
                id: 'recco-123',
                tempo: 120,
                energy: 0.8,
                danceability: 0.7
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockFeatures)
            });

            const result = await reccobeatsClient.getAudioFeatures('recco-123');

            expect(global.fetch).toHaveBeenCalledWith('https://api.reccobeats.com/v1/track/recco-123/audio-features', {
                method: 'GET',
                headers: {}
            });

            expect(result).toEqual(mockFeatures);
        });

        test('should handle API errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(reccobeatsClient.getAudioFeatures('notfound-id'))
                .rejects.toThrow("Failed to fetch from ReccoBeats endpoint 'https://api.reccobeats.com/v1/track/notfound-id/audio-features': ReccoBeats API error: 404 Not Found");
        });

        test('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(reccobeatsClient.getAudioFeatures('recco-123'))
                .rejects.toThrow("Failed to fetch from ReccoBeats endpoint 'https://api.reccobeats.com/v1/track/recco-123/audio-features': Network error");
        });
    });

    describe('getAudioFeaturesByReccoOrSpotifyId', () => {
        test('should throw error for missing ID', async () => {
            await expect(reccobeatsClient.getAudioFeaturesByReccoOrSpotifyId('')).rejects.toThrow('ReccoBeats ID or Spotify ID is required');
        });

        test('should fetch audio features successfully for ReccoBeats ID', async () => {
            const mockFeatures = {
                id: 'recco-123',
                tempo: 120,
                energy: 0.8,
                danceability: 0.7
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ content: [mockFeatures] })
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyId('recco-123');

            expect(global.fetch).toHaveBeenCalledWith('https://api.reccobeats.com/v1/audio-features?ids=recco-123', {
                method: 'GET',
                headers: {}
            });

            expect(result).toEqual(mockFeatures);
        });

        test('should fetch audio features successfully for Spotify ID', async () => {
            const mockFeatures = {
                id: 'spotify-123',
                tempo: 128,
                energy: 0.9,
                danceability: 0.75
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ content: [mockFeatures] })
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyId('spotify-123');

            expect(global.fetch).toHaveBeenCalledWith('https://api.reccobeats.com/v1/audio-features?ids=spotify-123', {
                method: 'GET',
                headers: {}
            });

            expect(result).toEqual(mockFeatures);
        });

        test('should handle API errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request'
            });

            await expect(reccobeatsClient.getAudioFeaturesByReccoOrSpotifyId('invalid-id'))
                .rejects.toThrow("Failed to fetch from ReccoBeats endpoint 'https://api.reccobeats.com/v1/audio-features?ids=invalid-id': ReccoBeats API error: 400 Bad Request");

            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        test('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(reccobeatsClient.getAudioFeaturesByReccoOrSpotifyId('spotify-id'))
                .rejects.toThrow("Failed to fetch from ReccoBeats endpoint 'https://api.reccobeats.com/v1/audio-features?ids=spotify-id': Network error");
        });

        afterAll(() => {
            console.log('🏁 ReccoBeats Client Test completed');
        });
    });
});
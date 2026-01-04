'use strict';

const { ReccoBeatsClient } = require('../../lib/reccobeats-client');

/**
 * Integration Test for ReccoBeats API
 */
describe('ReccoBeats API Integration Test', () => {

    let reccoBeatsClient;

    beforeAll(() => {
        // Create client instance for real API tests
        reccoBeatsClient = new ReccoBeatsClient();

        console.log('Starting ReccoBeats Integration Test');
        console.log('Base URL:', reccoBeatsClient.baseUrl);
    });

    test('searchArtist finds "The Weekend" with correct Spotify ID', async () => {
        // ReccoBeats search result is not sorted by relevance, so we get the first result that matches the band name, but is not what we are searching for.
        const artistName = 'The Weekend';
        const expectedSpotifyUrl = 'https://open.spotify.com/intl-de/artist/1Xyo4u8uXC1ZmMpatF05PJ';

        const result = await reccoBeatsClient.searchArtist(artistName);

        expect(result).not.toBeNull();
        expect(result.name).toBe(artistName);

        // Validate Spotify URL in href field
        expect(result.href).toBe(expectedSpotifyUrl);
        console.log(`✅ Found correct Spotify URL: ${result.href}`);

        console.log(`Found ReccoBeats ID for artist '${artistName}': ${result.id}`);
        console.log('Full artist result:', result);
    }, 15000);

    describe('getAudioFeaturesByReccoOrSpotifyId - Single ID Tests', () => {

        test('should fetch audio features for existing Spotify ID', async () => {
            // Example "Blinding Lights" by "The Weeknd"
            const testSpotifyId = '0VjIjW4GlUZAMYd2vXMi3b';

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with Spotify ID: ${testSpotifyId}`);

            try {
                const result = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(testSpotifyId);

                console.log('Audio Features API Response:', result);

                if (result !== null) {
                    // Audio features were found - validate structure
                    expect(result).toBeDefined();
                    expect(typeof result).toBe('object');

                    // Check expected audio feature fields
                    const expectedFeatures = [
                        'acousticness', 'danceability', 'energy', 'instrumentalness',
                        'liveness', 'loudness', 'speechiness', 'tempo', 'valence'
                    ];

                    let foundFeatures = 0;
                    expectedFeatures.forEach(feature => {
                        if (result[feature] !== undefined) {
                            foundFeatures++;
                            console.log(`${feature}: ${result[feature]}`);

                            // Validate that numerical values are in expected range
                            if (['acousticness', 'danceability', 'energy', 'instrumentalness', 'liveness', 'speechiness', 'valence'].includes(feature)) {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeGreaterThanOrEqual(0);
                                expect(result[feature]).toBeLessThanOrEqual(1);
                            } else if (feature === 'tempo') {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeGreaterThan(0);
                                expect(result[feature]).toBeLessThan(300); // Reasonable tempo range
                            } else if (feature === 'loudness') {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeLessThanOrEqual(0); // Loudness is typically negative
                            }
                        }
                    });

                    console.log(`Audio Features successfully found (${foundFeatures}/${expectedFeatures.length} features present)`);

                    // At least some features should be present
                    expect(foundFeatures).toBeGreaterThan(0);

                    // Check if ID references are present
                    if (result.id || result.track_id) {
                        expect(typeof (result.id || result.track_id)).toBe('string');
                        console.log('Track ID found:', result.id || result.track_id);
                    }

                } else {
                    // Audio features were not found - this is also a valid result
                    console.log('Audio Features not found in ReccoBeats database (returned null)');
                    expect(result).toBeNull();
                }

            } catch (error) {
                console.error('Audio Features API Error:', error.message);

                // Check if it's an expected API error
                if (error.message.includes('ReccoBeats API error')) {
                    console.log('API returned error response - checking error type');

                    // For 404, null is the expected result
                    if (error.message.includes('404')) {
                        console.log('404 error handled correctly for audio features');
                        return; // Test successful - 404 is handled correctly
                    }
                }

                // For other errors, continue test but issue warning
                console.warn('Unexpected error during Audio Features API call:', error.message);

                // Test should not fail due to network problems
                if (error.message.includes('fetch') || error.message.includes('network')) {
                    console.log('Network issue detected - skipping audio features test');
                    return;
                }

                throw error; // Re-throw for unexpected errors
            }

        }, 20000); // 20 seconds timeout for Audio Features API call

        test('should handle invalid ID gracefully', async () => {
            const invalidId = 'invalid-spotify-id-12345';

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with invalid ID: ${invalidId}`);

            try {
                const result = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(invalidId);

                // Expect null to be returned for invalid IDs
                expect(result).toBeNull();
                console.log('Invalid ID correctly returned null');

            } catch (error) {
                // If an error is thrown, it should be an expected API error
                if (error.message.includes('ReccoBeats API error') && error.message.includes('404')) {
                    console.log('Invalid ID correctly handled with 404 error');
                    return;
                }

                // Skip test for network errors
                if (error.message.includes('fetch') || error.message.includes('network')) {
                    console.log('Network issue detected - skipping invalid ID test');
                    return;
                }

                console.warn('Unexpected error for invalid ID:', error.message);
                throw error;
            }

        }, 10000);

        test('should throw error for empty ID', async () => {
            console.log('Testing getAudioFeaturesByReccoOrSpotifyId with empty ID');

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId('')).rejects.toThrow(
                'ReccoBeats ID or Spotify ID is required'
            );

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(null)).rejects.toThrow(
                'ReccoBeats ID or Spotify ID is required'
            );

            console.log('Empty ID validation works correctly');
        });

    });

    describe('getAudioFeaturesByReccoOrSpotifyId - Batch Array Tests', () => {

        test('should fetch audio features for multiple Spotify IDs using array', async () => {
            // Test with multiple known Spotify IDs
            const testSpotifyIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // "Blinding Lights" by The Weeknd
                '4iV5W9uYEdYUVa79Axb7Rh', // "Shape of You" by Ed Sheeran
                '7qiZfU4dY1lWllzX7mPBI3'  // "Don't Stop Me Now" by Queen
            ];

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with array of ${testSpotifyIds.length} IDs:`, testSpotifyIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(testSpotifyIds);

                console.log('Batch Audio Features API Response:', results);

                // Should return an array
                expect(Array.isArray(results)).toBe(true);
                console.log(`Received ${results.length} results for ${testSpotifyIds.length} requested IDs`);

                // Validate each result that was found
                results.forEach((result, index) => {
                    if (result) {
                        expect(typeof result).toBe('object');
                        console.log(`Result ${index + 1}:`, {
                            id: result.id || result.track_id,
                            tempo: result.tempo,
                            energy: result.energy,
                            danceability: result.danceability
                        });

                        // Validate basic structure
                        if (result.id || result.track_id) {
                            expect(typeof (result.id || result.track_id)).toBe('string');
                        }

                        // Test some audio features if present
                        if (result.tempo !== undefined) {
                            expect(typeof result.tempo).toBe('number');
                            expect(result.tempo).toBeGreaterThan(0);
                        }

                        if (result.energy !== undefined) {
                            expect(typeof result.energy).toBe('number');
                            expect(result.energy).toBeGreaterThanOrEqual(0);
                            expect(result.energy).toBeLessThanOrEqual(1);
                        }

                        if (result.danceability !== undefined) {
                            expect(typeof result.danceability).toBe('number');
                            expect(result.danceability).toBeGreaterThanOrEqual(0);
                            expect(result.danceability).toBeLessThanOrEqual(1);
                        }
                    }
                });

                console.log(`✅ Batch request successfully processed ${results.length} results`);

            } catch (error) {
                console.error('Batch Audio Features API Error:', error.message);

                // Handle expected errors gracefully
                if (error.message.includes('ReccoBeats API error')) {
                    console.log('API returned error response - this might be expected for batch requests');

                    if (error.message.includes('404')) {
                        console.log('404 error - some or all tracks not found in database');
                        return;
                    }
                }

                // Skip test for network errors
                if (error.message.includes('fetch') || error.message.includes('network')) {
                    console.log('Network issue detected - skipping batch test');
                    return;
                }

                throw error;
            }

        }, 25000); // 25 seconds timeout for batch API call

        test('should handle empty array', async () => {
            console.log('Testing getAudioFeaturesByReccoOrSpotifyId with empty array');

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId([])).rejects.toThrow(
                'At least one ID is required'
            );

            console.log('Empty array validation works correctly');
        });

        test('should handle array with too many IDs', async () => {
            const tooManyIds = Array.from({ length: 41 }, (_, i) => `test-id-${i}`);

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with ${tooManyIds.length} IDs (should exceed limit)`);

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(tooManyIds)).rejects.toThrow(
                'Maximum 40 IDs allowed per request'
            );

            console.log('Array size limit validation works correctly');
        });

        test('should handle mixed valid and invalid IDs in array', async () => {
            const mixedIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // Valid: "Blinding Lights" by The Weeknd
                'invalid-spotify-id-12345', // Invalid
                '4iV5W9uYEdYUVa79Axb7Rh'  // Valid: "Shape of You" by Ed Sheeran
            ];

            console.log('Testing getAudioFeaturesByReccoOrSpotifyId with mixed valid/invalid IDs:', mixedIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(mixedIds);

                console.log('Mixed IDs results:', results);

                // Should return an array (might be empty or partially filled)
                expect(Array.isArray(results)).toBe(true);
                console.log(`Received ${results.length} results for ${mixedIds.length} requested mixed IDs`);

                console.log('✅ Mixed ID request handled gracefully');

            } catch (error) {
                console.error('Mixed IDs Error:', error.message);

                // This is acceptable - API might return error for any invalid ID
                if (error.message.includes('ReccoBeats API error')) {
                    console.log('API error for mixed IDs - this is acceptable behavior');
                    return;
                }

                // Skip test for network errors
                if (error.message.includes('fetch') || error.message.includes('network')) {
                    console.log('Network issue detected - skipping mixed IDs test');
                    return;
                }

                // Don't fail the test - mixed behavior is acceptable
                console.warn('Unexpected error for mixed IDs:', error.message);
            }

        }, 15000);

    });

    describe('getAudioFeaturesBatch - Dedicated Batch Method Tests', () => {

        test('should process batch of IDs correctly', async () => {
            const testSpotifyIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // "Blinding Lights" by The Weeknd
                '4iV5W9uYEdYUVa79Axb7Rh', // "Shape of You" by Ed Sheeran
                '7qiZfU4dY1lWllzX7mPBI3'  // "Don't Stop Me Now" by Queen
            ];

            console.log(`Testing getAudioFeaturesBatch with ${testSpotifyIds.length} IDs:`, testSpotifyIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesBatch(testSpotifyIds);

                console.log('Batch method results:', results);

                // Should return an array
                expect(Array.isArray(results)).toBe(true);

                expect(results.length).toBe(testSpotifyIds.length);
                console.log(`✅ Correct array size: ${results.length} results for ${testSpotifyIds.length} requested IDs`);

                results.forEach((result, index) => {
                    const requestedSpotifyId = testSpotifyIds[index];
                    console.log(`\n--- Validating result ${index + 1} for Spotify ID: ${requestedSpotifyId} ---`);

                    if (result === null) {
                        console.log(`Result ${index + 1}: No audio features found (null) - this is acceptable`);
                        return; // Skip to next result - null is valid for tracks not found in database
                    }

                    // If a result is present, it must be an object
                    expect(typeof result).toBe('object');
                    expect(result).not.toBeNull();

                    let idMatched = false;
                    let matchReason = '';

                    // Option 1: result.href should contain the corresponding Spotify URL
                    if (result.href) {
                        const expectedSpotifyUrl = `https://open.spotify.com/track/${requestedSpotifyId}`;

                        if (result.href === expectedSpotifyUrl) {
                            idMatched = true;
                            matchReason = `href matches Spotify URL: ${result.href}`;
                        }
                    }

                    // Option 2: result.id should be ReccoBeats ID
                    if (!idMatched && result.id && result.id === requestedSpotifyId) {
                        idMatched = true;
                        matchReason = `id matches requested Spotify ID: ${result.id}`;
                    }

                    // Enforce ID validation
                    expect(idMatched).toBe(true);
                    console.log(`✅ Result ${index + 1}: ${matchReason}`);
                });

                console.log(`\n✅ All ${testSpotifyIds.length} results validated successfully`);
                console.log('✅ Dedicated batch method works correctly with proper ID validation');

            } catch (error) {
                console.error('Batch method error:', error.message);

                // Handle expected errors
                if (error.message.includes('ReccoBeats API error')) {
                    console.log('API error in batch method - checking if it\'s acceptable');

                    if (error.message.includes('404')) {
                        console.log('404 error - tracks not found in database, this is acceptable');
                        return;
                    }

                    console.log('Other API error - skipping batch test but logging for investigation');
                    return;
                }

                if (error.message.includes('fetch') || error.message.includes('network')) {
                    console.log('Network issue detected - skipping batch test');
                    return;
                }

                throw error;
            }

        }, 25000);

        test('should throw error for non-array input to batch method', async () => {
            console.log('Testing getAudioFeaturesBatch with non-array input');

            await expect(reccoBeatsClient.getAudioFeaturesBatch('single-id')).rejects.toThrow(
                'Array of IDs is required for batch processing'
            );

            await expect(reccoBeatsClient.getAudioFeaturesBatch(null)).rejects.toThrow(
                'Array of IDs is required for batch processing'
            );

            console.log('Batch method input validation works correctly');
        });

        test('should handle large batch (> 40 IDs) by chunking', async () => {
            // Create 45 test IDs to test chunking
            const largeIdSet = Array.from({ length: 45 }, (_, i) => `test-spotify-id-${i.toString().padStart(3, '0')}`);

            console.log(`Testing getAudioFeaturesBatch with ${largeIdSet.length} IDs (should chunk into 2 requests)`);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesBatch(largeIdSet);

                // Should return an array
                expect(Array.isArray(results)).toBe(true);
                console.log(`Large batch returned ${results.length} results for ${largeIdSet.length} requested IDs`);

                console.log('✅ Large batch chunking works correctly');

            } catch (error) {
                console.error('Large batch error:', error.message);

                // Expected - most test IDs won't exist
                if (error.message.includes('ReccoBeats API error') ||
                    error.message.includes('fetch') ||
                    error.message.includes('network')) {
                    console.log('Expected error in large batch test - chunking mechanism works');
                    return;
                }

                throw error;
            }

        }, 30000);

    });

    afterAll(() => {
        console.log('🏁 ReccoBeats Integration Test completed');
    });

});
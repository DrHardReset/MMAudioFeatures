var UI;
var processedTracksData = [];
var hasValidResults = false;
var spotifyClient = null;
var reccoBeatsClient = null;
var originalTracks = [];
var originalTracklist = null;
var dialogConfig = null;

// Search mode configuration, true to use Spotify search, false for ReccoBeats search
var USE_SPOTIFY_SEARCH = false;
var SEARCH_METHOD = null;

function initClients() {
    // Always initialize ReccoBeats client
    if (window.ReccoBeatsClient) {
        reccoBeatsClient = new window.ReccoBeatsClient();
    } else {
        uitools.toastMessage.show('ReccoBeats client not available. Please check if the library is loaded correctly.');
        return false;
    }

    // Use configuration to determine search method
    USE_SPOTIFY_SEARCH = dialogConfig.useSpotifySearch || false;

    // Only initialize Spotify client if we want to use it and credentials are available
    if (USE_SPOTIFY_SEARCH && window.SpotifyClient && dialogConfig.spotifyClient && dialogConfig.spotifySecret) {
        spotifyClient = new window.SpotifyClient(dialogConfig.spotifyClient, dialogConfig.spotifySecret);
    } else if (USE_SPOTIFY_SEARCH) {
        uitools.toastMessage.show('Spotify search requested but credentials not available. Falling back to ReccoBeats search.');
        USE_SPOTIFY_SEARCH = false;
    }

    SEARCH_METHOD = USE_SPOTIFY_SEARCH ? 'spotify' : 'reccobeats';
    return true;
}

async function processTracksInDialog() {
    try {
        const processedTracks = [];
        const trackIds = [];
        const trackIndices = [];

        // Authenticate Spotify if needed
        if (USE_SPOTIFY_SEARCH && spotifyClient) {
            await spotifyClient.authenticate();
        }

        // Perform track searches based on selected method
        for (let i = 0; i < originalTracks.length; i++) {
            const track = originalTracks[i];

            if (UI.statusBar) {
                const searchMethodDisplay = SEARCH_METHOD === 'spotify' ? 'Spotify' : 'ReccoBeats';
                UI.statusBar.innerHTML = `Searching track ${i + 1} of ${originalTracks.length} (${searchMethodDisplay}): ${track.artist} - ${track.title}`;
            }

            try {
                let trackResult = {
                    originalTrack: track,
                    foundTrack: null, // Generic track info (either Spotify or ReccoBeats)
                    searchMethod: SEARCH_METHOD,
                    audioFeatures: null,
                    error: null
                };

                if (USE_SPOTIFY_SEARCH && spotifyClient) {
                    // Spotify search
                    const searchResponse = await spotifyClient.searchTracks(track.artist, track.title);
                    const firstTrack = searchResponse.tracks.items[0];

                    if (firstTrack) {
                        trackResult.foundTrack = firstTrack;
                        trackIds.push(firstTrack.id);
                        trackIndices.push(i);
                    } else {
                        trackResult.error = 'No Spotify track found';
                    }
                } else {
                    // ReccoBeats search
                    try {
                        const foundTrack = await reccoBeatsClient.searchArtistTrack(track.artist, track.title);
                        if (foundTrack) {
                            trackResult.foundTrack = foundTrack;
                            trackIds.push(foundTrack.id);
                            trackIndices.push(i);
                        } else {
                            trackResult.error = 'No ReccoBeats track found';
                        }
                    } catch (searchError) {
                        trackResult.error = `ReccoBeats search failed: ${searchError.message}`;
                    }
                }

                processedTracks.push(trackResult);

            } catch (error) {
                console.error(`Error with track ${i + 1}:`, error);
                processedTracks.push({
                    originalTrack: track,
                    foundTrack: null,
                    searchMethod: SEARCH_METHOD,
                    audioFeatures: null,
                    error: error.message
                });
            }
        }

        // Load audio features for found tracks
        if (trackIds.length > 0) {
            if (UI.statusBar) {
                UI.statusBar.innerHTML = `Loading audio features for ${trackIds.length} tracks...`;
            }

            let batchSuccessful = false;

            // Try batch processing first
            try {
                const audioFeaturesResults = await reccoBeatsClient.getAudioFeaturesBatch(trackIds);

                if (Array.isArray(audioFeaturesResults) && audioFeaturesResults.length === trackIds.length) {
                    // Direct positional mapping - results should be in same order as requested IDs
                    trackIds.forEach((trackId, index) => {
                        const trackIndex = trackIndices[index];
                        const audioFeature = audioFeaturesResults[index];

                        if (audioFeature && audioFeature !== null) {
                            processedTracks[trackIndex].audioFeatures = audioFeature;
                        }
                    });

                    batchSuccessful = true;
                } else {
                    console.warn('Batch result size mismatch or invalid format, falling back to individual requests');
                }
            } catch (error) {
                console.error('Batch audio features loading failed:', error);
            }

            // Fallback to individual requests if batch failed
            if (!batchSuccessful) {
                for (let i = 0; i < trackIds.length; i++) {
                    const trackIndex = trackIndices[i];
                    try {
                        if (UI.statusBar) {
                            UI.statusBar.innerHTML = `Loading audio features for track ${trackIndex + 1}: ${originalTracks[trackIndex].artist} - ${originalTracks[trackIndex].title}`;
                        }

                        const audioFeatures = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(trackIds[i]);
                        processedTracks[trackIndex].audioFeatures = audioFeatures;

                    } catch (err) {
                        console.error(`Failed to load features for track ${trackIndex}:`, err);
                        processedTracks[trackIndex].audioFeatures = null;
                    }
                }
            }
        }

        displayResults(processedTracks);

    } catch (error) {
        console.error('Processing failed:', error);
        if (UI.statusBar) {
            UI.statusBar.innerHTML = 'Processing failed: ' + error.message;
        }

        uitools.toastMessage.show('Processing failed: ' + error.message);
    }
}

function displayResults(tracks, saveResult = null) {
    if (!UI || !UI.tracksContent || !UI.summaryContent) {
        console.error('UI not available');
        return;
    }

    if (!dialogConfig) {
        console.error('Dialog config not available');
        return;
    }

    processedTracksData = tracks;
    hasValidResults = tracks.some(track => track.audioFeatures && !track.error);

    let tracksHtml = '';
    let successCount = 0;

    tracks.forEach((trackResult, index) => {
        const track = trackResult.originalTrack;
        const foundTrack = trackResult.foundTrack;
        const features = trackResult.audioFeatures;
        const error = trackResult.error;
        const searchMethod = trackResult.searchMethod;

        tracksHtml += `<fieldset style="margin: 10px 20px; position: relative;">`;

        if (features && !error) {
            tracksHtml += `<legend style="display: flex; align-items: center; gap: 8px;">`;
            tracksHtml += `<input type="checkbox" id="track-checkbox-${index}" checked onchange="handleTrackSelectionChange(${index})" style="margin: 0;">`;
            tracksHtml += `<label for="track-checkbox-${index}" style="cursor: pointer;">${index + 1}. ${track.artist} - ${track.title}</label>`;
            tracksHtml += `</legend>`;
        } else {
            tracksHtml += `<legend>${index + 1}. ${track.artist} - ${track.title}</legend>`;
        }

        if (foundTrack && !error) {
            tracksHtml += `<div style="display: flex; gap: 15px; align-items: flex-start;">`;

            // Album cover (only for Spotify results)
            if (searchMethod === 'spotify') {
                tracksHtml += `<div style="flex-shrink: 0;">`;

                if (foundTrack.album && foundTrack.album.images && foundTrack.album.images.length > 0) {
                    const albumImage = foundTrack.album.images[0];
                    tracksHtml += `<img src="${albumImage.url}" alt="Album Cover" style="width: 120px; height: 120px; border-radius: 4px;">`;
                } else {
                    tracksHtml += `<div style="width: 120px; height: 120px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">No Cover</div>`;
                }

                tracksHtml += `</div>`;
            }

            tracksHtml += `<div style="flex: 1; min-width: 0;">`;
            tracksHtml += `<table style="width: 100%; table-layout: fixed;">`;
            tracksHtml += `<tbody>`;

            // Track title left and URL buttons right
            tracksHtml += `<tr>`;
            tracksHtml += `<td style="width: 150px;">Title</td>`;
            tracksHtml += `<td style="display: flex; justify-content: space-between; align-items: center;">`;
            tracksHtml += `<span>${searchMethod === 'spotify' ? foundTrack.name : foundTrack.trackTitle}</span>`;
            tracksHtml += `<div style="display: flex; gap: 4px; margin-left: 8px;">`;

            // URL buttons
            if (searchMethod === 'spotify') {
                tracksHtml += `<button onclick="handleTrackUrlCopy('${spotifyClient.getTrackUrl(foundTrack.id)}', 'spotify')" `;
                tracksHtml += `style="padding: 1px 4px; font-size: 10px; background: #1db954; color: black; border: none; border-radius: 2px; cursor: pointer;" `;
                tracksHtml += `title="Copy Spotify track URL">Spotify Track URL</button>`;
            } else {
                tracksHtml += `<button onclick="handleTrackUrlCopy('${reccoBeatsClient.getTrackUrl(foundTrack.id)}', 'reccobeats')" `;
                tracksHtml += `style="padding: 1px 4px; font-size: 10px; background: #22bfc3; color: black; border: none; border-radius: 2px; cursor: pointer;" `;
                tracksHtml += `title="Copy ReccoBeats track URL">ReccoBeats Track URL</button>`;

                tracksHtml += `<button onclick="handleTrackUrlCopy('${foundTrack.href}', 'spotify')" `;
                tracksHtml += `style="padding: 1px 4px; font-size: 10px; background: #1db954; color: black; border: none; border-radius: 2px; cursor: pointer;" `;
                tracksHtml += `title="Copy ReccoBeats track URL">Spotify Track URL</button>`;
            }

            tracksHtml += `</div>`;
            tracksHtml += `</td>`;
            tracksHtml += `</tr>`;

            // Artist name
            tracksHtml += `<tr>`;
            tracksHtml += `<td style="width: 150px;">Artist</td>`;
            tracksHtml += `<td>`;

            if (searchMethod === 'spotify') {
                tracksHtml += `${foundTrack.artists[0].name}`;
            } else {
                if (foundTrack.artists && foundTrack.artists.length > 0) {
                    tracksHtml += `${foundTrack.artists[0].name}`;
                } else {
                    tracksHtml += `Unknown Artist`;
                }
            }

            tracksHtml += `</td>`;
            tracksHtml += `</tr>`;

            // Album name (only for Spotify)
            if (searchMethod === 'spotify' && foundTrack.album) {
                tracksHtml += `<tr>`;
                tracksHtml += `<td style="width: 150px;">Album</td>`;
                tracksHtml += `<td>${foundTrack.album.name}</td>`;
                tracksHtml += `</tr>`;
            }

            // Duration
            tracksHtml += `<tr>`;
            tracksHtml += `<td style="width: 150px;">Duration</td>`;
            if (searchMethod === 'spotify') {
                tracksHtml += `<td>${Utils.formatDuration(foundTrack.duration_ms)}</td>`;
            } else {
                const duration = foundTrack.durationMs || 0;
                tracksHtml += `<td>${duration > 0 ? Utils.formatDuration(duration) : 'Unknown'}</td>`;
            }
            tracksHtml += `</tr>`;

            // Popularity (only for Spotify)
            if (searchMethod === 'spotify') {
                tracksHtml += `<tr>`;
                tracksHtml += `<td style="width: 150px;">Popularity</td>`;
                tracksHtml += `<td>${foundTrack.popularity}%</td>`;
                tracksHtml += `</tr>`;
            }

            tracksHtml += `</tbody>`;
            tracksHtml += `</table>`;
            tracksHtml += `</div>`;
            tracksHtml += `</div>`;

            if (features) {
                const hasEnabledFeatures = dialogConfig.saveDanceability || dialogConfig.saveEnergy ||
                    dialogConfig.saveValence || dialogConfig.saveAcousticness ||
                    dialogConfig.saveInstrumentalness || dialogConfig.saveBPM;

                if (hasEnabledFeatures) {
                    tracksHtml += `<hr style="margin: 15px 0; border: none; border-top: 1px solid #555;">`;
                    tracksHtml += `<table style="width: 100%; table-layout: fixed;">`;
                    tracksHtml += `<tbody>`;

                    if (dialogConfig.saveBPM && features.tempo !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td style="width: 150px;">Tempo (BPM)</td>`;

                        // Audio Features Button
                        tracksHtml += `<td style="display: flex; justify-content: space-between; align-items: center;">`;
                        tracksHtml += `<span>${Math.round(features.tempo)} BPM</span>`;
                        tracksHtml += `<div style="display: flex; gap: 4px; margin-left: 8px;">`;

                        if (features && features.id) {
                            tracksHtml += `<button onclick="handleAudioFeaturesUrlCopy('${features.id}')" `;
                            tracksHtml += `style="padding: 1px 4px; font-size: 10px; background: #22bfc3; color: black; border: none; border-radius: 2px; cursor: pointer;" `;
                            tracksHtml += `title="Copy Audio Features URL">Audio Features URL</button>`;
                        }

                        tracksHtml += `</div>`;
                        tracksHtml += `</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveInitialKey && features.key !== undefined && window.Utils) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td style="width: 150px;">Key</td>`;
                        tracksHtml += `<td>${window.Utils.convertKeyToString(features.key)}</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveDanceability && features.danceability !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td style="width: 150px;">Danceability</td>`;
                        tracksHtml += `<td>${(features.danceability * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveEnergy && features.energy !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td style="width: 150px;">Energy</td>`;
                        tracksHtml += `<td>${(features.energy * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveValence && features.valence !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td style="width: 150px;">Positivity</td>`;
                        tracksHtml += `<td>${(features.valence * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveAcousticness && features.acousticness !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td style="width: 150px;">Acoustics</td>`;
                        tracksHtml += `<td>${(features.acousticness * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveInstrumentalness && features.instrumentalness !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td style="width: 150px;">Instrumentalness</td>`;
                        tracksHtml += `<td>${(features.instrumentalness * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    tracksHtml += `</tbody>`;
                    tracksHtml += `</table>`;
                }
                successCount++;
            } else {
                tracksHtml += `<hr style="margin: 15px 0; border: none; border-top: 1px solid #555;">`;
                tracksHtml += `<div style="font-style: italic; color: #999; text-align: center; padding: 10px;">`;
                tracksHtml += `Audio Features: Not available`;
                tracksHtml += `</div>`;
            }
        } else {
            tracksHtml += `<div style="color: #ff6666; padding: 10px;">`;
            tracksHtml += `<strong>Error:</strong> ${error || `No ${searchMethod === 'spotify' ? 'Spotify' : 'ReccoBeats'} track found`}`;
            tracksHtml += `</div>`;
        }

        tracksHtml += `</fieldset>`;
    });

    UI.tracksContent.innerHTML = tracksHtml;
    updateSummary(saveResult);

    setTimeout(() => {
        updateSaveButtonState();
    }, 0);

    if (UI.statusBar && !saveResult) {
        const searchMethodDisplay = SEARCH_METHOD === 'spotify' ? 'Spotify' : 'ReccoBeats';
        UI.statusBar.innerHTML = `Processing completed (${searchMethodDisplay}): ${successCount}/${tracks.length} successful`;
    }
}

function updateSummary(saveResult) {
    const selectedTracks = getSelectedTracksForSaving();

    let summaryHtml = '';
    summaryHtml += `<fieldset style="margin: 10px 20px;">`;
    summaryHtml += `<legend>Summary</legend>`;
    summaryHtml += `<table style="width: 100%; table-layout: fixed;">`;
    summaryHtml += `<tbody>`;

    const searchMethodDisplay = SEARCH_METHOD === 'spotify' ? 'Spotify' : 'ReccoBeats';
    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Search method</td>`;
    summaryHtml += `<td><span style="background: ${SEARCH_METHOD === 'spotify' ? '#1db954' : '#22bfc3'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${searchMethodDisplay}</span></td>`;
    summaryHtml += `</tr>`;

    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Tracks processed</td>`;
    summaryHtml += `<td><strong>${processedTracksData.length}</strong></td>`;
    summaryHtml += `</tr>`;

    const successCount = processedTracksData.filter(track => track.audioFeatures && !track.error).length;
    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Audio features loaded</td>`;
    summaryHtml += `<td><strong>${successCount}</strong></td>`;
    summaryHtml += `</tr>`;

    if (!saveResult) {
        summaryHtml += `<tr>`;
        summaryHtml += `<td style="width: 150px;">Selected for save</td>`;
        summaryHtml += `<td><strong>${selectedTracks.length}</strong></td>`;
        summaryHtml += `</tr>`;
    }

    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Errors</td>`;
    summaryHtml += `<td><strong>${processedTracksData.length - successCount}</strong></td>`;
    summaryHtml += `</tr>`;

    if (!saveResult) {
        summaryHtml += `<tr><td colspan="2"><hr style="margin: 8px 0; border: none; border-top: 1px solid #555;"></td></tr>`;
        summaryHtml += `<tr>`;
        summaryHtml += `<td style="width: 150px;">Fields to save</td>`;

        let enabledFields = [];
        if (dialogConfig.saveBPM) enabledFields.push('BPM');
        if (dialogConfig.saveInitialKey) enabledFields.push('Key');
        if (dialogConfig.saveDanceability) enabledFields.push('Danceability');
        if (dialogConfig.saveEnergy) enabledFields.push('Energy');
        if (dialogConfig.saveValence) enabledFields.push('Valence');
        if (dialogConfig.saveAcousticness) enabledFields.push('Acoustics');
        if (dialogConfig.saveInstrumentalness) enabledFields.push('Instrumentalness');
        if (dialogConfig.saveComment) enabledFields.push('Comment');

        summaryHtml += `<td>${enabledFields.length > 0 ? enabledFields.join(', ') : '<span style="color: #ff6666;">None selected</span>'}</td>`;
        summaryHtml += `</tr>`;
    }

    if (saveResult) {
        summaryHtml += `<tr><td colspan="2"><hr style="margin: 8px 0; border: none; border-top: 1px solid #555;"></td></tr>`;
        if (saveResult.success) {
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="color: #66ff66; width: 150px;">Save Status</td>`;
            summaryHtml += `<td style="color: #66ff66;"><strong>Completed Successfully!</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="width: 150px;">Successfully saved</td>`;
            summaryHtml += `<td><strong>${saveResult.savedCount}</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="width: 150px;">Save errors</td>`;
            summaryHtml += `<td><strong>${saveResult.errorCount}</strong></td>`;
            tracksHtml += `</tr>`;
        } else {
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="color: #ff6666; width: 150px;">Save Status</td>`;
            summaryHtml += `<td style="color: #ff6666;"><strong>Failed</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td colspan="2" style="color: #ff6666;">${saveResult.message}</td>`;
            summaryHtml += `</tr>`;
        }
    }

    summaryHtml += `</tbody>`;
    summaryHtml += `</table>`;
    summaryHtml += `</fieldset>`;

    UI.summaryContent.innerHTML = summaryHtml;
}

async function saveAudioFeatures() {
    const selectedTracks = getSelectedTracksForSaving();

    if (!originalTracklist || selectedTracks.length === 0) {
        uitools.toastMessage.show('No tracks selected for saving. Please select tracks with audio features.');
        return;
    }

    if (!dialogConfig) {
        uitools.toastMessage.show('Configuration not available.');
        return;
    }

    var savedCount = 0;
    var errorCount = 0;

    updateButtonText('Saving...');

    if (UI.statusBar) {
        UI.statusBar.innerHTML = 'Saving selected audio features...';
    }

    try {
        originalTracklist.locked(() => {
            Promise.all(selectedTracks.map(async ({ trackData, index }) => {
                try {
                    const track = originalTracklist.getValue(trackData.originalTrack.index);

                    if (!track) {
                        console.warn(`Track with index ${trackData.originalTrack.index} not found`);
                        errorCount++;
                        return;
                    }

                    const features = trackData.audioFeatures;

                    // Set BPM only if enabled
                    if (dialogConfig.saveBPM && features.tempo) {
                        track.bpm = Math.round(features.tempo);
                    }

                    // Set Initial Key only if enabled
                    if (dialogConfig.saveInitialKey && features.key !== undefined && window.Utils) {
                        track.initialKey = window.Utils.convertKeyToString(features.key);
                    }

                    // Set Custom Fields only if enabled
                    if (dialogConfig.saveDanceability && features.danceability !== undefined) {
                        track.custom1 = features.danceability.toFixed(3);
                    }
                    if (dialogConfig.saveEnergy && features.energy !== undefined) {
                        track.custom2 = features.energy.toFixed(3);
                    }
                    if (dialogConfig.saveValence && features.valence !== undefined) {
                        track.custom3 = features.valence.toFixed(3);
                    }
                    if (dialogConfig.saveAcousticness && features.acousticness !== undefined) {
                        track.custom4 = features.acousticness.toFixed(3);
                    }
                    if (dialogConfig.saveInstrumentalness && features.instrumentalness !== undefined) {
                        track.custom5 = features.instrumentalness.toFixed(3);
                    }

                    // Set Comment only if enabled
                    if (dialogConfig.saveComment) {
                        let commentFields = [];
                        if (dialogConfig.saveDanceability) commentFields.push('* Custom1: Danceability');
                        if (dialogConfig.saveEnergy) commentFields.push('* Custom2: Energy');
                        if (dialogConfig.saveValence) commentFields.push('* Custom3: Valence');
                        if (dialogConfig.saveAcousticness) commentFields.push('* Custom4: Acousticness');
                        if (dialogConfig.saveInstrumentalness) commentFields.push('* Custom5: Instrumentalness');

                        if (commentFields.length > 0) {
                            const audioFeaturesComment = `
##############################
AudioFeatures:
${commentFields.join('\n')}
##############################`;

                            var existingComment = await track.getCommentAsync() || '';
                            var newComment = existingComment.replace(/##############################\s*AudioFeatures:.*?##############################/gs, '').trim();

                            if (newComment) {
                                newComment += audioFeaturesComment;
                            } else {
                                newComment = audioFeaturesComment.trim();
                            }

                            await track.setCommentAsync(newComment);
                        }
                    }

                    await track.commitAsync();
                    savedCount++;
                } catch (error) {
                    console.error(`Error saving track ${index + 1}:`, error);
                    errorCount++;
                }
            })).then(() => {
                // Reset button text and hide button
                updateButtonText('Save Audio Features to ID3 Tags');
                UI.btnSave.style.display = 'none';

                updateSummary({
                    success: true,
                    savedCount: savedCount,
                    errorCount: errorCount
                });

                if (UI.statusBar) {
                    UI.statusBar.innerHTML = `Save completed: ${savedCount}/${savedCount + errorCount} successful`;
                }

            }).catch((error) => {
                console.error('Save failed:', error);

                updateButtonText('Save Audio Features to ID3 Tags');
                UI.btnSave.style.display = 'none';

                updateSummary({
                    success: false,
                    message: 'Save failed: ' + error.message
                });

                if (UI.statusBar) {
                    UI.statusBar.innerHTML = 'Save failed: ' + error.message;
                }
            });
        });

    } catch (error) {
        console.error('Save failed:', error);

        updateButtonText('Save Audio Features to ID3 Tags');
        UI.btnSave.style.display = 'none';

        updateSummary({
            success: false,
            message: 'Save failed: ' + error.message
        });

        if (UI.statusBar) {
            UI.statusBar.innerHTML = 'Save failed: ' + error.message;
        }
    }
}

function updateButtonText(text) {
    if (!UI.btnSave) return;

    const buttonDiv = UI.btnSave.querySelector('.button');
    if (buttonDiv) {
        buttonDiv.innerHTML = text;
    } else {
        UI.btnSave.innerHTML = text;
    }
}

function updateSaveButtonState() {
    const selectedTracks = getSelectedTracksForSaving();

    if (selectedTracks.length > 0 && UI.btnSave) {
        UI.btnSave.style.display = 'block';
    } else if (UI.btnSave) {
        UI.btnSave.style.display = 'none';
    }

    updateSummary(null);
}

function handleTrackSelectionChange(index) {
    updateSaveButtonState();
}

function handleTrackUrlCopy(trackUrl, clientType) {
    copyToClipboard(trackUrl);

    if (UI.statusBar) {
        const originalText = UI.statusBar.innerHTML;
        const clientName = clientType === 'spotify' ? 'Spotify' : 'ReccoBeats';
        UI.statusBar.innerHTML = `Copied ${clientName} track URL to clipboard: ${trackUrl}`;
        setTimeout(() => {
            UI.statusBar.innerHTML = originalText;
        }, 2000);
    }
}

function handleAudioFeaturesUrlCopy(trackId) {
    let featuresUrl;

    try {
        featuresUrl = reccoBeatsClient.getAudioFeaturesUrl(trackId);
    } catch (error) {
        console.error('Error generating audio features URL:', error);
        return;
    }

    copyToClipboard(featuresUrl);

    if (UI.statusBar) {
        const originalText = UI.statusBar.innerHTML;
        UI.statusBar.innerHTML = `Copied ReccoBeats audio features URL to clipboard: ${featuresUrl}`;
        setTimeout(() => {
            UI.statusBar.innerHTML = originalText;
        }, 2000);
    }
}

function copyToClipboard(text) {
    try {
        navigator.clipboard.writeText(text);
    } catch (error) {
        console.error('Clipboard copy failed:', error);
    }
}

function getSelectedTracksForSaving() {
    const selectedTracks = [];
    processedTracksData.forEach((trackData, index) => {
        const checkbox = document.getElementById(`track-checkbox-${index}`);
        if (checkbox && checkbox.checked && trackData.audioFeatures && !trackData.error) {
            selectedTracks.push({ trackData, index });
        }
    });
    return selectedTracks;
}

function updateSummary(saveResult) {
    const selectedTracks = getSelectedTracksForSaving();

    let summaryHtml = '';
    summaryHtml += `<fieldset style="margin: 10px 20px;">`;
    summaryHtml += `<legend>Summary</legend>`;
    summaryHtml += `<table style="width: 100%; table-layout: fixed;">`;
    summaryHtml += `<tbody>`;

    // Add search method info
    const searchMethod = USE_SPOTIFY_SEARCH ? 'Spotify' : 'ReccoBeats';
    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Search method</td>`;
    summaryHtml += `<td><span style="background: ${USE_SPOTIFY_SEARCH ? '#1db954' : '#22bfc3'}; color: black; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${searchMethod}</span></td>`;
    summaryHtml += `</tr>`;

    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Tracks processed</td>`;
    summaryHtml += `<td><strong>${processedTracksData.length}</strong></td>`;
    summaryHtml += `</tr>`;

    const successCount = processedTracksData.filter(track => track.audioFeatures && !track.error).length;
    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Audio features loaded</td>`;
    summaryHtml += `<td><strong>${successCount}</strong></td>`;
    summaryHtml += `</tr>`;

    if (!saveResult) {
        summaryHtml += `<tr>`;
        summaryHtml += `<td style="width: 150px;">Selected for save</td>`;
        summaryHtml += `<td><strong>${selectedTracks.length}</strong></td>`;
        summaryHtml += `</tr>`;
    }

    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 150px;">Errors</td>`;
    summaryHtml += `<td><strong>${processedTracksData.length - successCount}</strong></td>`;
    summaryHtml += `</tr>`;

    if (!saveResult) {
        summaryHtml += `<tr><td colspan="2"><hr style="margin: 8px 0; border: none; border-top: 1px solid #555;"></td></tr>`;
        summaryHtml += `<tr>`;
        summaryHtml += `<td style="width: 150px;">Fields to save</td>`;

        let enabledFields = [];
        if (dialogConfig.saveBPM) enabledFields.push('BPM');
        if (dialogConfig.saveInitialKey) enabledFields.push('Key');
        if (dialogConfig.saveDanceability) enabledFields.push('Danceability');
        if (dialogConfig.saveEnergy) enabledFields.push('Energy');
        if (dialogConfig.saveValence) enabledFields.push('Valence');
        if (dialogConfig.saveAcousticness) enabledFields.push('Acoustics');
        if (dialogConfig.saveInstrumentalness) enabledFields.push('Instrumentalness');
        if (dialogConfig.saveComment) enabledFields.push('Comment');

        summaryHtml += `<td>${enabledFields.length > 0 ? enabledFields.join(', ') : '<span style="color: #ff6666;">None selected</span>'}</td>`;
        summaryHtml += `</tr>`;
    }

    if (saveResult) {
        summaryHtml += `<tr><td colspan="2"><hr style="margin: 8px 0; border: none; border-top: 1px solid #555;"></td></tr>`;
        if (saveResult.success) {
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="color: #66ff66; width: 150px;">Save Status</td>`;
            summaryHtml += `<td style="color: #66ff66;"><strong>Completed Successfully!</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="width: 150px;">Successfully saved</td>`;
            summaryHtml += `<td><strong>${saveResult.savedCount}</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="width: 150px;">Save errors</td>`;
            summaryHtml += `<td><strong>${saveResult.errorCount}</strong></td>`;
            summaryHtml += `</tr>`;
        } else {
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="color: #ff6666; width: 150px;">Save Status</td>`;
            summaryHtml += `<td style="color: #ff6666;"><strong>Failed</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td colspan="2" style="color: #ff6666;">${saveResult.message}</td>`;
            summaryHtml += `</tr>`;
        }
    }

    summaryHtml += `</tbody>`;
    summaryHtml += `</table>`;
    summaryHtml += `</fieldset>`;

    UI.summaryContent.innerHTML = summaryHtml;
}

function init(params) {
    this.title = _('Audio Features Search');

    UI = getAllUIElements();

    if (params && params.inData) {
        originalTracks = params.inData.tracks || [];
        originalTracklist = params.inData.tracklist;
        dialogConfig = params.inData.config || {};

        // Initialize clients and check if successful
        if (!initClients()) {
            return;
        }
    } else {
        console.error('No data received from parent');
        return;
    }

    // Save button handler
    localListen(UI.btnSave, 'click', () => {
        if (hasValidResults) {
            saveAudioFeatures();
        }
    });
    UI.btnSave.style.display = 'none';

    UI.statusBar.innerHTML = '';

    // Start processing automatically
    if (originalTracks.length > 0) {
        processTracksInDialog();
    } else {
        if (UI.statusBar) {
            UI.statusBar.innerHTML = 'No tracks received for processing';
        }
    }
}
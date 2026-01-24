var UI;
var processedTracksData = [];
var hasValidResults = false;
var spotifyClient = null;
var reccoBeatsClient = null;
var originalTracks = [];
var originalTracklist = null;
var dialogConfig = null;
var processingStartTime = null;
var processingDuration = null;

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

/**
 * Shows a loading animation for track searching.
 */
function showLoadingAnimation() {
    if (!UI || !UI.tracksContent) return;

    const searchMethodDisplay = SEARCH_METHOD === 'spotify' ? 'Spotify' : 'ReccoBeats';
    const searchColor = SEARCH_METHOD === 'spotify' ? '#1db954' : '#22bfc3';

    UI.tracksContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; padding: 40px;">
            <div style="position: relative; width: 80px; height: 80px; margin-bottom: 30px;">
                <div style="
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    border: 8px solid rgba(255, 255, 255, 0.1);
                    border-top: 8px solid ${searchColor};
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
            </div>
            <h2 style="color: #fff; margin: 0 0 15px 0; font-size: 24px;">Searching for Tracks...</h2>
            <p style="color: #999; margin: 0 0 10px 0; font-size: 14px;">
                Using <span style="color: ${searchColor}; font-weight: bold;">${searchMethodDisplay}</span> search
            </p>
            <p style="color: #666; margin: 0; font-size: 12px; text-align: center; max-width: 400px;">
                Processing ${originalTracks.length} track${originalTracks.length !== 1 ? 's' : ''}...<br>
                This may take a moment, please be patient.
            </p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

/**
 * Shows a loading animation for audio features retrieval.
 */
function showAudioFeaturesLoading(trackCount) {
    if (!UI || !UI.tracksContent) return;

    const searchColor = SEARCH_METHOD === 'spotify' ? '#1db954' : '#22bfc3';

    UI.tracksContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; padding: 40px;">
            <div style="position: relative; width: 80px; height: 80px; margin-bottom: 30px;">
                <div style="
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    border: 8px solid rgba(255, 255, 255, 0.1);
                    border-top: 8px solid #22bfc3;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
            </div>
            <h2 style="color: #fff; margin: 0 0 15px 0; font-size: 24px;">Loading Audio Features...</h2>
            <p style="color: #999; margin: 0 0 10px 0; font-size: 14px;">
                Retrieving data from <span style="color: #22bfc3; font-weight: bold;">ReccoBeats</span>
            </p>
            <p style="color: #666; margin: 0; font-size: 12px; text-align: center; max-width: 400px;">
                Processing audio features for ${trackCount} track${trackCount !== 1 ? 's' : ''}...<br>
                Almost done!
            </p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

async function processTracksInDialog() {
    try {
        processingStartTime = Date.now();

        // Show loading animation immediately
        showLoadingAnimation();

        const processedTracks = [];
        const trackIds = [];
        const trackIndices = [];

        reccoBeatsClient.clearCache();

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
                    foundTrack: null,
                    searchMethod: SEARCH_METHOD,
                    audioFeatures: null,
                    error: null
                };

                // Determine if we should use album in search
                // Only use album if albumArtist is set and if first album artist matches first track artist (not a sampler)
                let useAlbum = false;
                if (track.album && track.albumArtist && track.artist) {
                    // Get first artist from both (handle semicolon-separated lists)
                    const firstTrackArtist = track.artist.split(';')[0].trim();
                    const firstAlbumArtist = track.albumArtist.split(';')[0].trim();

                    // Use album only if artists match (not a sampler/compilation)
                    useAlbum = firstTrackArtist === firstAlbumArtist;

                    if (!useAlbum) {
                        console.log(`Skipping album for track "${track.title}" - detected sampler (Artist: "${firstTrackArtist}" vs AlbumArtist: "${firstAlbumArtist}")`);
                    }
                }

                const albumForSearch = useAlbum ? track.album : null;

                if (USE_SPOTIFY_SEARCH && spotifyClient) {
                    // Spotify search with optional album
                    const searchResponse = await spotifyClient.searchTracks(track.artist, track.title, albumForSearch);
                    const firstTrack = searchResponse.tracks.items[0];

                    if (firstTrack) {
                        trackResult.foundTrack = firstTrack;
                        trackIds.push(firstTrack.id);
                        trackIndices.push(i);
                    } else {
                        trackResult.error = 'No Spotify track found';
                    }
                } else {
                    // ReccoBeats search with optional album
                    try {
                        const foundTrack = await reccoBeatsClient.searchTracks(track.artist, track.title, albumForSearch);
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
            // Show audio features loading animation
            showAudioFeaturesLoading(trackIds.length);

            if (UI.statusBar) {
                UI.statusBar.innerHTML = `Loading audio features for ${trackIds.length} tracks...`;
            }

            try {
                const audioFeaturesResults = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(trackIds);

                if (Array.isArray(audioFeaturesResults) && audioFeaturesResults.length === trackIds.length) {
                    // Direct positional mapping - results are in same order as requested IDs
                    trackIds.forEach((trackId, index) => {
                        const trackIndex = trackIndices[index];
                        const audioFeature = audioFeaturesResults[index];

                        if (audioFeature && audioFeature !== null) {
                            processedTracks[trackIndex].audioFeatures = audioFeature;
                        }
                    });
                } else {
                    console.warn('Result size mismatch or invalid format');
                }
            } catch (error) {
                console.error('Audio features loading failed:', error);
                if (UI.statusBar) {
                    UI.statusBar.innerHTML = 'Audio features loading failed: ' + error.message;
                }
            }
        }

        processingDuration = (Date.now() - processingStartTime) / 1000; // in seconds
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

    let tracksHtml = `
        <style>
            .info-label {
                padding: 4px 8px 4px 0;
                color: #999;
            }
            
            .info-value {
                padding: 4px 0;
                color: #fff;
            }
            
            .info-label-wide {
                padding: 4px 8px 4px 0;
                color: #999;
                width: 120px;
            }
            
            .info-label-narrow {
                padding: 4px 8px 4px 0;
                color: #999;
                width: 80px;
            }
            
            .section-header {
                margin: 0 0 10px 0;
                color: #fff;
                font-size: 14px;
            }
            
            .info-table {
                width: 100%;
                font-size: 13px;
            }
            
            .badge {
                background: #22bfc3;
                color: black;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
            }
            
            .badge-spotify {
                background: #1db954;
                color: black;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
            }
            
            .btn-url {
                padding: 6px 10px;
                font-size: 11px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                white-space: nowrap;
                min-width: 140px;
            }
            
            .btn-reccobeats {
                background: #22bfc3;
                color: black;
            }
            
            .btn-spotify {
                background: #1db954;
                color: black;
            }

            .info-message {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                color: #666;
                min-height: 60px;
            }
        </style>
    `;

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
            // Four-column layout: Album Cover | Track Info | Audio Features | Buttons
            tracksHtml += `<div style="display: grid; grid-template-columns: ${searchMethod === 'spotify' ? '120px' : ''} 1fr 1fr auto; gap: 15px; align-items: start;">`;

            // Column 1: Album cover (only for Spotify results)
            if (searchMethod === 'spotify') {
                tracksHtml += `<div style="display: flex; align-items: center; justify-content: center; min-height: 100%;">`;
                if (foundTrack.album && foundTrack.album.images && foundTrack.album.images.length > 0) {
                    const albumImage = foundTrack.album.images[0];
                    tracksHtml += `<img src="${albumImage.url}" alt="Album Cover" style="width: 120px; height: 120px; border-radius: 4px;">`;
                } else {
                    tracksHtml += `<div style="width: 120px; height: 120px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">No Cover</div>`;
                }
                tracksHtml += `</div>`;
            }

            // Column 2: Track Information
            tracksHtml += `<div style="min-width: 0;">`;
            tracksHtml += `<h4 class="section-header">Track Information</h4>`;
            tracksHtml += `<table class="info-table">`;
            tracksHtml += `<tbody>`;

            // Title
            tracksHtml += `<tr>`;
            tracksHtml += `<td class="info-label-narrow">Title</td>`;
            tracksHtml += `<td class="info-value">${searchMethod === 'spotify' ? foundTrack.name : foundTrack.trackTitle}</td>`;
            tracksHtml += `</tr>`;

            // Artist
            tracksHtml += `<tr>`;
            tracksHtml += `<td class="info-label">Artist</td>`;
            tracksHtml += `<td class="info-value">`;
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

            // Album
            if (searchMethod === 'spotify' && foundTrack.album) {
                tracksHtml += `<tr>`;
                tracksHtml += `<td class="info-label">Album</td>`;
                tracksHtml += `<td class="info-value">${foundTrack.album.name}</td>`;
                tracksHtml += `</tr>`;
            } else if (searchMethod === 'reccobeats' && foundTrack.albumInfo && foundTrack.albumInfo.name) {
                tracksHtml += `<tr>`;
                tracksHtml += `<td class="info-label">Album</td>`;
                tracksHtml += `<td class="info-value">${foundTrack.albumInfo.name}</td>`;
                tracksHtml += `</tr>`;
            }

            // Duration
            tracksHtml += `<tr>`;
            tracksHtml += `<td class="info-label">Duration</td>`;
            tracksHtml += `<td class="info-value">`;
            if (searchMethod === 'spotify') {
                tracksHtml += `${Utils.formatDuration(foundTrack.duration_ms)}`;
            } else {
                const duration = foundTrack.durationMs || 0;
                tracksHtml += `${duration > 0 ? Utils.formatDuration(duration) : 'Unknown'}`;
            }
            tracksHtml += `</td>`;
            tracksHtml += `</tr>`;

            // Popularity
            if (foundTrack.popularity !== undefined && foundTrack.popularity !== null) {
                tracksHtml += `<tr>`;
                tracksHtml += `<td class="info-label">Popularity</td>`;
                tracksHtml += `<td class="info-value">${foundTrack.popularity}%</td>`;
                tracksHtml += `</tr>`;
            }

            tracksHtml += `</tbody>`;
            tracksHtml += `</table>`;
            tracksHtml += `</div>`;

            // Column 3: Audio Features
            tracksHtml += `<div style="min-width: 0; display: flex; flex-direction: column;">`;
            tracksHtml += `<h4 class="section-header">Audio Features</h4>`;

            if (features) {
                const hasEnabledFeatures = dialogConfig.saveDanceability || dialogConfig.saveEnergy ||
                    dialogConfig.saveValence || dialogConfig.saveAcousticness ||
                    dialogConfig.saveInstrumentalness || dialogConfig.saveBPM || dialogConfig.saveInitialKey;

                if (hasEnabledFeatures) {
                    tracksHtml += `<table class="info-table">`;
                    tracksHtml += `<tbody>`;

                    if (dialogConfig.saveBPM && features.tempo !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td class="info-label-wide">Tempo (BPM)</td>`;
                        tracksHtml += `<td class="info-value">${Math.round(features.tempo)} BPM</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveInitialKey && features.key !== undefined && window.Utils) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td class="info-label">Key</td>`;
                        tracksHtml += `<td class="info-value">${window.Utils.convertKeyToString(features.key)}</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveDanceability && features.danceability !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td class="info-label">Danceability</td>`;
                        tracksHtml += `<td class="info-value">${(features.danceability * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveEnergy && features.energy !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td class="info-label">Energy</td>`;
                        tracksHtml += `<td class="info-value">${(features.energy * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveValence && features.valence !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td class="info-label">Positivity</td>`;
                        tracksHtml += `<td class="info-value">${(features.valence * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveAcousticness && features.acousticness !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td class="info-label">Acoustics</td>`;
                        tracksHtml += `<td class="info-value">${(features.acousticness * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    if (dialogConfig.saveInstrumentalness && features.instrumentalness !== undefined) {
                        tracksHtml += `<tr>`;
                        tracksHtml += `<td class="info-label">Instrumentalness</td>`;
                        tracksHtml += `<td class="info-value">${(features.instrumentalness * 100).toFixed(1)}%</td>`;
                        tracksHtml += `</tr>`;
                    }

                    tracksHtml += `</tbody>`;
                    tracksHtml += `</table>`;
                    successCount++;
                } else {
                    tracksHtml += `<div class="info-message">No features enabled</div>`;

                }
            } else {
                tracksHtml += `<div class="info-message">Not available</div>`;
            }
            tracksHtml += `</div>`;

            // Column 4: URLs
            tracksHtml += `<div style="display: flex; flex-direction: column;">`;
            tracksHtml += `<h4 class="section-header">Raw Data URLs</h4>`;
            tracksHtml += `<div style="display: flex; flex-direction: column; gap: 8px;">`;

            // Track URL buttons
            if (searchMethod === 'spotify') {
                tracksHtml += `<button onclick="handleTrackUrlCopy('${spotifyClient.getTrackUrl(foundTrack.id)}', 'spotify')" `;
                tracksHtml += `class="btn-url btn-spotify" data-tip="Copy Spotify Track URL">Copy Spotify Track</button>`;
            } else {
                tracksHtml += `<button onclick="handleTrackUrlCopy('${reccoBeatsClient.getTrackUrl(foundTrack.id)}', 'reccobeats')" `;
                tracksHtml += `class="btn-url btn-reccobeats" data-tip="Copy ReccoBeats Track URL">Copy ReccoBeats Track</button>`;

                tracksHtml += `<button onclick="handleTrackUrlCopy('${foundTrack.href}', 'spotify')" `;
                tracksHtml += `class="btn-url btn-spotify" data-tip="Copy Spotify Track URL">Copy Spotify Track</button>`;
            }

            // Audio Features URL button
            if (features && features.id) {
                tracksHtml += `<button onclick="handleAudioFeaturesUrlCopy('${features.id}')" `;
                tracksHtml += `class="btn-url btn-reccobeats" data-tip="Copy Audio Features URL">Copy Audio Features</button>`;
            }

            tracksHtml += `</div>`;
            tracksHtml += `</div>`;

            tracksHtml += `</div>`; // End grid
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
    summaryHtml += `<td style="width: 250px;">Data sources (Track Info / Audio Features)</td>`;
    summaryHtml += `<td>`;
    summaryHtml += `<span style="background: ${SEARCH_METHOD === 'spotify' ? '#1db954' : '#22bfc3'}; color: black; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${searchMethodDisplay}</span>`;
    summaryHtml += ` / `;
    summaryHtml += `<span style="background: #22bfc3; color: black; padding: 2px 6px; border-radius: 3px; font-size: 11px;">ReccoBeats</span>`;
    summaryHtml += `</td>`;
    summaryHtml += `</tr>`;

    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 250px;">Tracks processed (Amount / Duration)</td>`;
    summaryHtml += `<td>`;
    summaryHtml += `${processedTracksData.length}`;
    if (processingDuration !== null) {
        summaryHtml += ` / ${processingDuration.toFixed(1)} seconds`;
    }
    summaryHtml += `</td>`;
    summaryHtml += `</tr>`;

    const successCount = processedTracksData.filter(track => track.audioFeatures && !track.error).length;
    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 250px;">Audio features loaded</td>`;
    summaryHtml += `<td><strong>${successCount}</strong></td>`;
    summaryHtml += `</tr>`;

    if (!saveResult) {
        summaryHtml += `<tr>`;
        summaryHtml += `<td style="width: 250px;">Selected for save</td>`;
        summaryHtml += `<td><strong>${selectedTracks.length}</strong></td>`;
        summaryHtml += `</tr>`;
    }

    summaryHtml += `<tr>`;
    summaryHtml += `<td style="width: 250px;">Errors</td>`;
    summaryHtml += `<td><strong>${processedTracksData.length - successCount}</strong></td>`;
    summaryHtml += `</tr>`;

    if (!saveResult) {
        summaryHtml += `<tr><td colspan="2"><hr style="margin: 8px 0; border: none; border-top: 1px solid #555;"></td></tr>`;
        summaryHtml += `<tr>`;
        summaryHtml += `<td style="width: 250px;">Fields to save</td>`;

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
            summaryHtml += `<td style="color: #66ff66; width: 250px;">Save Status</td>`;
            summaryHtml += `<td style="color: #66ff66;"><strong>Completed Successfully!</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="width: 250px;">Successfully saved</td>`;
            summaryHtml += `<td><strong>${saveResult.savedCount}</strong></td>`;
            summaryHtml += `</tr>`;
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="width: 250px;">Save errors</td>`;
            summaryHtml += `<td><strong>${saveResult.errorCount}</strong></td>`;
            summaryHtml += `</tr>`;
        } else {
            summaryHtml += `<tr>`;
            summaryHtml += `<td style="color: #ff6666; width: 250px;">Save Status</td>`;
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
window.configInfo = {
    load: function (pnlDiv, addon) {
        // Load config with defaults - all ID3 tag options enabled by default
        this.config = app.getValue('MMAudioFeatures_config', {
            spotifyClient: '',
            spotifySecret: '',
            // ID3 tag options
            saveBPM: true,
            saveInitialKey: true,
            saveDanceability: true,
            saveEnergy: true,
            saveValence: true,
            saveAcousticness: true,
            saveInstrumentalness: true,
            saveComment: true
        });

        // Set UI elements to the configuration settings
        var UI = getAllUIElements(pnlDiv);

        UI.txtSpotifyClient.controlClass.value = this.config.spotifyClient;
        UI.txtSpotifySecret.controlClass.value = this.config.spotifySecret;

        // Set checkbox states
        UI.chkSaveBPM.controlClass.checked = this.config.saveBPM;
        UI.chkSaveInitialKey.controlClass.checked = this.config.saveInitialKey;
        UI.chkSaveDanceability.controlClass.checked = this.config.saveDanceability;
        UI.chkSaveEnergy.controlClass.checked = this.config.saveEnergy;
        UI.chkSaveValence.controlClass.checked = this.config.saveValence;
        UI.chkSaveAcousticness.controlClass.checked = this.config.saveAcousticness;
        UI.chkSaveInstrumentalness.controlClass.checked = this.config.saveInstrumentalness;
        UI.chkSaveComment.controlClass.checked = this.config.saveComment;

        // Store UI reference for event handlers
        this.UI = UI;

        // Setup event handlers for custom field checkboxes
        this.setupCustomFieldHandlers();

        // Initial update of comment checkbox state
        this.updateCommentCheckbox();
    },

    setupCustomFieldHandlers: function () {
        var self = this;

        // Add event listeners to all custom field checkboxes
        var customFieldCheckboxes = [
            this.UI.chkSaveDanceability,
            this.UI.chkSaveEnergy,
            this.UI.chkSaveValence,
            this.UI.chkSaveAcousticness,
            this.UI.chkSaveInstrumentalness
        ];

        customFieldCheckboxes.forEach(function (checkbox) {
            if (checkbox && checkbox.controlClass) {
                localListen(checkbox, 'click', function () {
                    self.updateCommentCheckbox();
                });
            }
        });
    },

    updateCommentCheckbox: function () {
        if (!this.UI || !this.UI.chkSaveComment) return;

        // Check if any custom field is enabled
        var hasCustomFields =
            this.UI.chkSaveDanceability.controlClass.checked ||
            this.UI.chkSaveEnergy.controlClass.checked ||
            this.UI.chkSaveValence.controlClass.checked ||
            this.UI.chkSaveAcousticness.controlClass.checked ||
            this.UI.chkSaveInstrumentalness.controlClass.checked;

        // Enable/disable comment checkbox based on custom fields
        this.UI.chkSaveComment.controlClass.enabled = hasCustomFields;

        // If no custom fields are selected, uncheck the comment checkbox
        if (!hasCustomFields) {
            this.UI.chkSaveComment.controlClass.checked = false;
        }
    },

    save: function (pnlDiv, addon) {
        // Save settings according to the UI changes
        var UI = getAllUIElements(pnlDiv);

        this.config.spotifyClient = UI.txtSpotifyClient.controlClass.value;
        this.config.spotifySecret = UI.txtSpotifySecret.controlClass.value;

        // Save checkbox states
        this.config.saveBPM = UI.chkSaveBPM.controlClass.checked;
        this.config.saveInitialKey = UI.chkSaveInitialKey.controlClass.checked;
        this.config.saveDanceability = UI.chkSaveDanceability.controlClass.checked;
        this.config.saveEnergy = UI.chkSaveEnergy.controlClass.checked;
        this.config.saveValence = UI.chkSaveValence.controlClass.checked;
        this.config.saveAcousticness = UI.chkSaveAcousticness.controlClass.checked;
        this.config.saveInstrumentalness = UI.chkSaveInstrumentalness.controlClass.checked;
        this.config.saveComment = UI.chkSaveComment.controlClass.checked;

        app.setValue('MMAudioFeatures_config', this.config);
    }
}
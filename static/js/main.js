document.addEventListener('DOMContentLoaded', function() {
// Helper functions for status checking and display
async function checkStatus(generationId) {
    try {
        const response = await fetch(`/check-status/${generationId}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Status check failed:', error);
        return { state: 'error', error: error.message };
    }
}

function displayVideo(videoUrl, state) {
    previewArea.innerHTML = `
        <div class="card mt-4">
            <div class="card-body">
                <h5 class="card-title">Generated Animation</h5>
                <p class="card-text"><small class="text-muted">Status: ${state}</small></p>
                <video controls class="w-100">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="mt-3">
                    <a href="${videoUrl}" class="btn btn-primary" download>Download Video</a>
                </div>
            </div>
        </div>
    `;
}

function displayStatus(state, generationId) {
    let statusMessage;
    let progressClass = 'progress-bar-animated';
    let progressPercentage;
    let estimatedTime = '';
    
    switch (state) {
        case 'queued':
            statusMessage = 'Queued: Your animation will begin processing soon...';
            progressPercentage = 25;
            estimatedTime = 'Estimated wait time: 1-2 minutes';
            break;
        case 'processing':
            statusMessage = 'Processing: Creating your animation...';
            progressPercentage = 75;
            estimatedTime = 'Estimated time remaining: 2-3 minutes';
            break;
        case 'completed':
            statusMessage = 'Almost done: Finalizing your animation...';
            progressPercentage = 100;
            progressClass = '';
            estimatedTime = 'Completing in a few seconds...';
            break;
        default:
            statusMessage = `Current status: ${state}`;
            progressPercentage = 50;
    }
    
    previewArea.innerHTML = `
        <div class="alert alert-info">
            <h5>Generation in Progress</h5>
            <p>${statusMessage}</p>
            <p class="text-muted small">${estimatedTime}</p>
            <p class="small">Generation ID: ${generationId}</p>
            <div class="progress mt-3">
                <div class="progress-bar progress-bar-striped ${progressClass}" 
                     role="progressbar" 
                     style="width: ${progressPercentage}%; transition: width 0.5s ease-in-out;"
                     aria-valuenow="${progressPercentage}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                    ${progressPercentage}%
                </div>
            </div>
        </div>
    `;
}

function displayError(message, prompt) {
    previewArea.innerHTML = `
        <div class="alert alert-danger">
            <h5>Generation Failed</h5>
            <p>${message}</p>
            <button type="button" class="btn btn-primary mt-3" onclick="retryGeneration('${prompt.replace(/'/g, "\\'")}')">
                <i class="bi bi-arrow-clockwise"></i> Retry Generation
            </button>
        </div>
    `;
}

function retryGeneration(prompt) {
    // Clear error message
    previewArea.innerHTML = '';
    // Set the prompt back in the input
    promptInput.value = prompt;
    // Trigger form submission
    generateForm.dispatchEvent(new Event('submit'));
}

    const generateForm = document.getElementById('generateForm');
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const previewArea = document.getElementById('previewArea');
    const progressBar = document.getElementById('progressBar');
    
    if (generateForm) {
        generateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Update UI for generation start
            progressBar.style.display = 'block';
            generateBtn.disabled = true;
            previewArea.innerHTML = `
                <div class="alert alert-info">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Generating your animation...
                </div>
            `;
            
            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    body: new FormData(generateForm)
                });
                
                const data = await response.json();
                console.log('API Response:', data); // Debug log
                
                if (response.ok && data.success) {
                    const generationId = data.generation_id;
                    const initialState = data.state || 'queued';
                    const videoUrl = data.video_url;
                    
                    if (videoUrl) {
                        // If we already have a video URL, display it
                        displayVideo(videoUrl, initialState);
                    } else {
                        // Show initial status
                        displayStatus(initialState, generationId);
                        
                        // Set up polling interval
                        const pollingInterval = setInterval(async () => {
                            const status = await checkStatus(generationId);
                            if (status.video_url) {
                                displayVideo(status.video_url, status.state);
                                clearInterval(pollingInterval);
                            } else if (status.state === 'failed') {
                                displayError(`Generation failed: ${status.failure_reason || 'Unknown error'}`);
                                clearInterval(pollingInterval);
                            } else {
                                displayStatus(status.state, generationId);
                            }
                        }, 5000); // Poll every 5 seconds
                        
                        // Store interval ID to clear it if needed
                        window.currentPollingInterval = pollingInterval;
                    }
                } else {
                    // Show error message
                    const errorMessage = data.error || 'Failed to generate animation';
                    console.error('Generation Error:', errorMessage);
                    displayError(errorMessage, promptInput.value);
                }
            } catch (error) {
                console.error('Request Error:', error);
                previewArea.innerHTML = `
                    <div class="alert alert-danger">
                        <h5>Error</h5>
                        <p>${error.message}</p>
                    </div>
                `;
            } finally {
                progressBar.style.display = 'none';
                generateBtn.disabled = false;
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
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
                    // Show generation status
                    const status = data.status || 'processing';
                    const videoUrl = data.video_url;
                    
                    if (videoUrl) {
                        // Display the generated video
                        previewArea.innerHTML = `
                            <div class="card mt-4">
                                <div class="card-body">
                                    <h5 class="card-title">Generated Animation</h5>
                                    <p class="card-text"><small class="text-muted">Status: ${status}</small></p>
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
                    } else {
                        // Show processing status
                        previewArea.innerHTML = `
                            <div class="alert alert-info">
                                <h5>Generation in Progress</h5>
                                <p>Status: ${status}</p>
                                <p>Generation ID: ${data.generation_id}</p>
                                <div class="progress mt-2">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                         role="progressbar" style="width: 100%"></div>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    // Show error message
                    const errorMessage = data.error || 'Failed to generate animation';
                    console.error('Generation Error:', errorMessage);
                    previewArea.innerHTML = `
                        <div class="alert alert-danger">
                            <h5>Generation Failed</h5>
                            <p>${errorMessage}</p>
                        </div>
                    `;
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

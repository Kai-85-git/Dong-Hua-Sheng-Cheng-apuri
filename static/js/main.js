document.addEventListener('DOMContentLoaded', function() {
    const generateForm = document.getElementById('generateForm');
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const previewArea = document.getElementById('previewArea');
    const progressBar = document.getElementById('progressBar');
    
    if (generateForm) {
        generateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show progress bar
            progressBar.style.display = 'block';
            generateBtn.disabled = true;
            
            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    body: new FormData(generateForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Display the generated video
                    previewArea.innerHTML = `
                        <div class="card mt-4">
                            <div class="card-body">
                                <h5 class="card-title">Generated Animation</h5>
                                <video controls class="w-100">
                                    <source src="${data.video_url}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                                <a href="${data.video_url}" class="btn btn-primary mt-3" download>Download Video</a>
                            </div>
                        </div>
                    `;
                } else {
                    throw new Error(data.error || 'Failed to generate animation');
                }
            } catch (error) {
                alert(error.message);
            } finally {
                progressBar.style.display = 'none';
                generateBtn.disabled = false;
            }
        });
    }
});

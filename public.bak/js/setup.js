document.getElementById('setupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const config = {};
    
    formData.forEach((value, key) => {
        const keys = key.split('.');
        let current = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = current[keys[i]] || {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    });

    try {
        const response = await fetch('/api/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            throw new Error('Failed to save configuration');
        }

        const result = await response.json();
        if (result.success) {
            alert('Configuration saved successfully');
            window.location.href = '/';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});
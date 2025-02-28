            // Handle 401 Unauthorized responses
            if (response.status === 401) {
                // Check if this is not a login request
                const isLoginRequest = args[0] === '/api/auth/login' || 
                                      (args[1] && args[1].url === '/api/auth/login');
                
                if (!isLoginRequest) {
                    console.warn('Session expired or unauthorized, redirecting to login');
                    showLoginScreen();
                    showNotification('Your session has expired. Please log in again.', 'error');
                }
            }
            
            return response;
        } catch (error) {
            // Handle network errors
            console.error('Network error:', error);
            
            // Only show notification for non-login requests to avoid loops
            const isLoginRequest = args[0] === '/api/auth/login' || 
                                  (args[1] && args[1].url === '/api/auth/login');
            
            if (!isLoginRequest) {
                showNotification('Network error. Please check your connection.', 'error');
            }
            
            throw error;
        }
    };
});
import threading
from rest_framework_simplejwt.tokens import AccessToken

tenant_state = threading.local()

class TenantMiddleware:
    """
    Intercepts the incoming HTTP request, reads the JWT Authorization Bearer, 
    and extracts the authenticated username to dynamically pin the target MySQL Database context.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Default all operations to the Master Database
        tenant_state.db = 'default'
        
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                # Safely decrypt the JWT block and unpack the username string
                access_token = AccessToken(token)
                username = access_token.get('username')
                tenant_state.username = username
                
                print(f"--- [TenantMiddleware] Intercepted JWT Username: {username} ---")
                
                # Dynamic Routing Filter
                if username and username.lower() == 'surya':
                    tenant_state.db = 'surya_castings'
                    print("--- [TenantMiddleware] Route Switch: surya_castings ---")
                    
            except Exception as e:
                print(f"--- [TenantMiddleware] JWT Decode Error: {str(e)} ---")
                pass # Proceed natively if the token is malformed

        print(f"--- [TenantMiddleware] Final Target DB: {tenant_state.db} ---")
        response = self.get_response(request)
        return response

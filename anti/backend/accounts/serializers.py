from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        if user.client:
            token['client_name'] = user.client.name
            token['api_endpoint'] = user.client.api_endpoint
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        if self.user.client:
            data['api_endpoint'] = self.user.client.api_endpoint
            data['client_name'] = self.user.client.name
        return data

from rest_framework import serializers

class TwoFactorSetupSerializer(serializers.Serializer):
    # no input — server generates temp secret and returns otpauth_url / qr
    pass

class TwoFactorVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)

class TwoFactorDisableSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)
    code = serializers.CharField(max_length=6, required=False, allow_blank=True)

class LoginWith2FASerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    code = serializers.CharField(max_length=6, required=False, allow_blank=True)

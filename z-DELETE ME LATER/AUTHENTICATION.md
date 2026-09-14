for the api consumption, here is what i want you to do and how i want you to do it:

1. use this endpoint first:
   POST /api/auth/register-number/
   {
   "phone": ""
   }

this will produce a value looking like this:

{
"verification_id": "0d44a382-6662-47ee-8889-acb959bfcff7",
"expires_in": 600,
"message": "OTP sent to +2348178786756",
"code": "346188"
}

2.  Then verify the phone number using this endpoint route: /api/auth/verify-otp/

{
"verification_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
"code": "string"
}

automatically fetch the verification id from the response from the other POST request, but for the otp, let the user enter it into the app himself.

this will produce something like this:

{
"user": {
"id": 35,
"phone": "+2348178786756",
"name": "+2348178786756",
"business_name": null,
"business_type": null,
"profile_image": null,
"has_pin": false,
"onboarding_status": "verify_number",
"subscription_status": "none",
"access_active": false,
"is_paid": false
},
"tokens": {
"access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzkzNTIzNTI3LCJpYXQiOjE3ODkyMDM1MjcsImp0aSI6ImYxNzk4YmVhM2EyZDQzNjg4MzFmYWM4ZjM3OTE3YWUzIiwidXNlcl9pZCI6IjM1In0.PSzyXF1LPmSvg4GmZAXaz8owG29SbU48_FfH_LffwMc",
"refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MzUyMzUyNywiaWF0IjoxNzg5MjAzNTI3LCJqdGkiOiI0MDliMThiZTAwMWU0MDRiYmFlNjViZGVjN2U5NTVjMCIsInVzZXJfaWQiOiIzNSJ9.ISiNHg8XK8gSU4Sx3gY4XmUrpAOPH4UDa5ccl3DeIXA"
},
"is_new_user": true,
"has_pin": false,
"needs_onboarding": true,
"verification_id": "0d44a382-6662-47ee-8889-acb959bfcff7"
}

Do the needfull by getting to the next screen, which is the part where you choose your business

3.  fetch from this endpoint to select the business: /api/auth/business-types/

and then move to the next screens where we create pins, call this endpoint: /api/auth/complete-registration/

{
"business_type": "general_retail",
"pin": "stri",
"confirm_pin": "stri",
}

with that, we have completed the onboarding experience...

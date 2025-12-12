# Supported AI Provider Models

StackLens AI supports multiple AI providers for error analysis and suggestions. All credentials are stored securely with AES-256-GCM encryption.

## Supported Providers

### 1. Google Gemini
- **Provider Code**: `gemini` or `google`
- **Description**: Google's Gemini AI models (Gemini Pro, Flash)
- **Endpoint**: `https://generativelanguage.googleapis.com`
- **API Key Required**: Yes
- **API Secret**: No
- **Get API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Models Available**: 
  - `gemini-1.5-pro`
  - `gemini-1.5-flash`
  - `gemini-pro`
- **Pricing**: Free tier available, pay-as-you-go

### 2. OpenAI
- **Provider Code**: `openai`
- **Description**: GPT-4, GPT-3.5, and other OpenAI models
- **Endpoint**: `https://api.openai.com/v1`
- **API Key Required**: Yes
- **API Secret**: No
- **Get API Key**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Models Available**:
  - `gpt-4-turbo`
  - `gpt-4`
  - `gpt-3.5-turbo`
- **Pricing**: Pay-per-token usage

### 3. Anthropic Claude
- **Provider Code**: `anthropic`
- **Description**: Claude 3 and Claude 2 models by Anthropic
- **Endpoint**: `https://api.anthropic.com`
- **API Key Required**: Yes
- **API Secret**: No
- **Get API Key**: [Anthropic Console](https://console.anthropic.com/)
- **Models Available**:
  - `claude-3-opus`
  - `claude-3-sonnet`
  - `claude-3-haiku`
  - `claude-2.1`
- **Pricing**: Pay-per-token usage

### 4. OpenRouter
- **Provider Code**: `openrouter`
- **Description**: Access multiple AI models through one unified API
- **Endpoint**: `https://openrouter.ai/api/v1`
- **API Key Required**: Yes
- **API Secret**: No
- **Get API Key**: [OpenRouter Dashboard](https://openrouter.ai/keys)
- **Models Available**: 100+ models including:
  - All OpenAI models
  - All Anthropic models
  - All Google models
  - Meta Llama models
  - Mistral models
  - And many more
- **Pricing**: Varies by model, competitive rates

### 5. Groq
- **Provider Code**: `groq`
- **Description**: Ultra-fast LLM inference with Groq's LPU™ technology
- **Endpoint**: `https://api.groq.com/openai/v1`
- **API Key Required**: Yes
- **API Secret**: No
- **Get API Key**: [Groq Console](https://console.groq.com/keys)
- **Models Available**:
  - `llama3-70b-8192` (Recommended)
  - `llama3-8b-8192`
  - `mixtral-8x7b-32768`
  - `gemma-7b-it`
- **Pricing**: Free tier available with rate limits

### 6. Grok (xAI)
- **Provider Code**: `grok`
- **Description**: Elon Musk's xAI Grok models
- **Endpoint**: `https://api.x.ai/v1`
- **API Key Required**: Yes
- **API Secret**: No
- **Get API Key**: [xAI Console](https://console.x.ai/)
- **Models Available**:
  - `grok-beta` (Main model)
  - `grok-vision-beta` (Multimodal)
- **Pricing**: Pay-per-token usage
- **Note**: Uses OpenAI-compatible API format

## Configuration Methods

### Method 1: Admin Panel (Recommended)
1. Navigate to **Admin Dashboard** → **API & Integration Settings**
2. Click **Add Credential**
3. Fill in the form:
   - **Name**: Descriptive name (e.g., "gemini-primary")
   - **Provider**: Select from dropdown
   - **API Key**: Paste your API key
   - **Endpoint**: Auto-populated (can be customized)
   - **Global**: Toggle for all users or user-specific
   - **Rate Limit**: Set monthly usage limit (optional)
4. Click **Create Credential**

### Method 2: Environment Variables (Fallback)
Add to your `.env` file:

```env
# Google Gemini
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_API_KEY=your_google_key_here

# OpenAI
OPENAI_API_KEY=your_openai_key_here

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key_here

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key_here

# Groq
GROQ_API_KEY=your_groq_key_here

# Grok (xAI)
GROK_API_KEY=your_grok_key_here

# Encryption key for stored credentials (required)
ENCRYPTION_KEY=generate_with_node_crypto_randomBytes_32_hex
```

## Provider Priority

When multiple providers are configured, StackLens uses them in this order:

1. **Gemini** (Primary) - Fast, reliable, free tier
2. **OpenAI** (Secondary) - High quality, widely compatible
3. **Anthropic** (Tertiary) - Advanced reasoning capabilities
4. **OpenRouter** (Quaternary) - Access to multiple models
5. **Groq** (Quinary) - Ultra-fast inference
6. **Grok** (Senary) - Latest xAI technology

If a provider fails, the system automatically falls back to the next available provider.

## Usage Tracking

For each credential, StackLens tracks:
- **Usage Count**: Total number of API calls
- **Current Month Usage**: Calls this month
- **Last Used**: Timestamp of last API call
- **Rate Limit**: Monthly limit (if configured)

Monitor usage in the Admin Panel to:
- Avoid hitting rate limits
- Track costs
- Identify most-used credentials
- Manage credential rotation

## Security Features

### Encryption
- All API keys encrypted with AES-256-GCM
- Encryption key stored in environment
- Keys never exposed in API responses

### Access Control
- **Global Credentials**: Available to all users
- **User-Specific**: Only accessible by owner
- **Admin-Only Management**: Only admins can create/edit
- **Active/Inactive Toggle**: Disable without deleting

### Best Practices
1. Use environment variable for encryption key
2. Rotate API keys periodically
3. Set rate limits to prevent overuse
4. Monitor usage regularly
5. Use global credentials for shared access
6. Keep user-specific credentials for testing

## Testing Credentials

Test your credentials from the Admin Panel:
1. Navigate to API Credentials Manager
2. Find your credential in the list
3. Click **Test** button
4. View test results (success/failure)

## API Response Format

All providers return suggestions in this format:

```typescript
interface AISuggestion {
  rootCause: string;              // What caused the error
  resolutionSteps: string[];      // Steps to fix
  codeExample?: string;           // Example code/config
  preventionMeasures: string[];   // How to prevent
  confidence: number;             // 0.0 to 1.0
}
```

## Troubleshooting

### Provider Not Working?
1. Check API key is valid
2. Verify endpoint URL is correct
3. Ensure credential is marked as "Active"
4. Check rate limits haven't been exceeded
5. Review server logs for error details

### All Providers Failing?
1. Check network connectivity
2. Verify encryption key is set correctly
3. Check database connection
4. Review API server logs
5. Try environment variable fallback

### High Costs?
1. Set rate limits on credentials
2. Monitor monthly usage
3. Use free tier providers (Gemini, Groq)
4. Implement caching (future feature)
5. Switch to cheaper providers

## Custom Endpoints

For self-hosted or enterprise versions:

```typescript
{
  "name": "custom-openai",
  "provider": "openai",
  "apiKey": "your_key",
  "endpoint": "https://your-custom-endpoint.com/v1",
  "isGlobal": true
}
```

## Support & Resources

- **Documentation**: [StackLens Docs](https://github.com/deepanimators/StackLens-AI)
- **Issues**: [GitHub Issues](https://github.com/deepanimators/StackLens-AI/issues)
- **API Docs**: Check each provider's official documentation
- **Community**: Join our Discord/Slack for support

---

**Last Updated**: December 2025  
**Version**: 1.0.0

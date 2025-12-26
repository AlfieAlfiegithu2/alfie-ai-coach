#!/bin/bash
# Dictation Translation Runner
# Calls the Edge Function repeatedly to translate ALL sentences in ALL 69 languages

SUPABASE_URL="https://cuumxmfzhwljylbdlflj.supabase.co"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/dictation-batch-translate"

# All 69 supported languages
LANGUAGES=(
    "zh" "zh-TW" "es" "hi" "ar" "bn" "pt" "ru" "ja" "ko" "vi" "fr" "de" "it" "tr"
    "th" "id" "ms" "tl" "my" "km" "ur" "ta" "te" "mr" "gu" "kn" "ml" "pa" "or"
    "as" "ne" "si" "fa" "he" "ps" "nl" "pl" "uk" "ro" "el" "cs" "hu" "sv" "bg"
    "sr" "hr" "sk" "no" "da" "fi" "sq" "sl" "et" "lv" "lt" "uz" "kk" "az" "mn"
    "ka" "hy" "sw" "ha" "yo" "ig" "am" "zu" "af" "yue"
)

BATCH_SIZE=15

echo "🚀 Starting Global Dictation Translation..."
echo "📦 Languages to process: ${#LANGUAGES[@]}"

for lang in "${LANGUAGES[@]}"; do
    echo ""
    echo "🌍 Starting language: $lang"
    CONTINUE_FROM=""
    HAS_MORE="true"
    
    while [ "$HAS_MORE" = "true" ]; do
        PAYLOAD="{\"lang\":\"$lang\",\"batchSize\":$BATCH_SIZE"
        if [ -n "$CONTINUE_FROM" ]; then
            PAYLOAD="$PAYLOAD,\"continueFrom\":\"$CONTINUE_FROM\""
        fi
        PAYLOAD="$PAYLOAD}"
        
        RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD")
        
        # Parse response
        SUCCESS=$(echo $RESPONSE | grep -o '"success":true' || true)
        PROCESSED=$(echo $RESPONSE | grep -oP '"processed":\K\d+' || echo "0")
        LAST_ID=$(echo $RESPONSE | grep -oP '"lastId":"\K[^"]+' || true)
        HAS_MORE_RAW=$(echo $RESPONSE | grep -o '"hasMore":true' || true)
        
        if [ -n "$SUCCESS" ]; then
            echo "  ✅ Processed $PROCESSED sentences"
            CONTINUE_FROM="$LAST_ID"
            
            if [ -z "$HAS_MORE_RAW" ]; then
                HAS_MORE="false"
                echo "  ✨ Language $lang complete!"
            fi
        else
            echo "  ❌ Error: $RESPONSE"
            HAS_MORE="false"
        fi
        
        # Small delay between calls
        sleep 1
    done
done

echo ""
echo "🎉 All translations complete!"

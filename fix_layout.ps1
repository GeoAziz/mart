# Delete the problematic layout file and use the clean one
Remove-Item "f:\prototype\mart\src\app\account\layout.tsx" -Force
Rename-Item "f:\prototype\mart\src\app\account\layout_clean.tsx" "layout.tsx"
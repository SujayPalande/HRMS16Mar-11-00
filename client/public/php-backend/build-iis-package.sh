#!/usr/bin/env bash
# =============================================================================
# HR Connect — Build & Package for SpeedCloud IIS Deployment
# =============================================================================
# Usage:
#   bash php-backend/build-iis-package.sh
#
# Output:
#   hrconnect-iis-deploy.zip  (ready to upload to SpeedCloud)
# =============================================================================

set -e

PACKAGE_NAME="hrconnect-iis-deploy"
OUTPUT_DIR="./${PACKAGE_NAME}"
ZIP_FILE="${PACKAGE_NAME}.zip"

echo "=============================="
echo " HR Connect — IIS Build"
echo "=============================="
echo ""

# Step 1: Build React frontend
echo "Step 1: Building React frontend..."
npm run build
echo "Done — dist/ created."
echo ""

# Step 2: Create package folder
echo "Step 2: Creating package folder..."
rm -rf "${OUTPUT_DIR}" "${ZIP_FILE}"
mkdir -p "${OUTPUT_DIR}/api/config" \
          "${OUTPUT_DIR}/api/controllers" \
          "${OUTPUT_DIR}/api/helpers" \
          "${OUTPUT_DIR}/data"

# Step 3: Copy React build output (SPA)
echo "Step 3: Copying React build..."
cp -r dist/. "${OUTPUT_DIR}/"

# Step 4: Copy web.config
echo "Step 4: Copying IIS web.config..."
cp php-backend/web.config "${OUTPUT_DIR}/web.config"

# Step 5: Copy PHP backend
echo "Step 5: Copying PHP backend..."
cp php-backend/index.php        "${OUTPUT_DIR}/api/"
cp php-backend/setup.php        "${OUTPUT_DIR}/api/"
cp php-backend/schema.sql       "${OUTPUT_DIR}/api/"
cp php-backend/config/*.php     "${OUTPUT_DIR}/api/config/"
cp php-backend/controllers/*.php "${OUTPUT_DIR}/api/controllers/"
cp php-backend/helpers/*.php    "${OUTPUT_DIR}/api/helpers/"

# Step 6: Copy system-settings.json (default settings)
echo "Step 6: Copying default settings..."
cp data/system-settings.json    "${OUTPUT_DIR}/data/"

# Step 7: Create a .htaccess fallback for Apache hosts
cat > "${OUTPUT_DIR}/.htaccess" << 'HTACCESS'
# Apache fallback (not needed for IIS — use web.config instead)
Options -MultiViews
RewriteEngine On
RewriteRule ^api/(.*)$ api/index.php [QSA,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
HTACCESS

# Step 8: Create zip
echo "Step 7: Creating zip package..."
if command -v zip &>/dev/null; then
    cd "${OUTPUT_DIR}" && zip -r "../${ZIP_FILE}" . && cd ..
elif command -v powershell &>/dev/null; then
    powershell -Command "Compress-Archive -Path '${OUTPUT_DIR}\\*' -DestinationPath '${ZIP_FILE}'"
else
    echo "WARNING: zip not available. Package folder created at ./${OUTPUT_DIR}"
fi

# Clean up temp folder
rm -rf "${OUTPUT_DIR}"

echo ""
echo "=============================="
echo " Package ready: ${ZIP_FILE}"
echo "=============================="
echo ""
echo "Next steps:"
echo "  1. Upload ${ZIP_FILE} to SpeedCloud web root"
echo "  2. Extract it"
echo "  3. Edit api/config/database.php with your DB credentials"
echo "     OR set env vars in SpeedCloud Control Panel"
echo "  4. Visit https://yourdomain.com/api/setup.php to initialise the DB"
echo "  5. DELETE api/setup.php immediately after!"
echo "  6. Login with: admin / Admin@1234"
echo ""

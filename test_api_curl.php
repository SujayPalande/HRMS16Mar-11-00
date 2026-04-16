<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://hrms.cybaemtech.app:84/api/login");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_HEADER, true);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if(curl_errno($ch)){
    echo "cURL Error: " . curl_error($ch);
} else {
    echo "HTTP Status: " . $httpcode . "\n";
    echo "Response:\n";
    echo substr($response, 0, 500);
}
curl_close($ch);

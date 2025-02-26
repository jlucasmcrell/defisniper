@echo off
echo Creating CryptoSniperBot shortcut...

:: Get the directory where the batch file is located
set "BOT_DIR=%~dp0"

:: Create a shortcut on the desktop
set "SCRIPT="%TEMP%\CreateShortcut.vbs""
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.ExpandEnvironmentStrings("%%USERPROFILE%%\Desktop\CryptoSniperBot.lnk") >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = """%BOT_DIR%start-bot.bat""" >> %SCRIPT%
echo oLink.WorkingDirectory = """%BOT_DIR%""" >> %SCRIPT%
echo oLink.IconLocation = "%%SystemRoot%%\System32\SHELL32.dll,137" >> %SCRIPT%
echo oLink.Description = "CryptoSniperBot Trading Bot" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
echo Shortcut created on your desktop!
echo You can now move it to your taskbar if desired.
echo.
pause
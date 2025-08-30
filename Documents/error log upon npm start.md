
➜  twins git:(main) ✗ npm start

> twins-app@0.1.0 start
> expo start

Starting project at /home/nhat/Documents/GitHub/twins
Starting Metro Bundler
The following packages should be updated for best compatibility with the installed expo version:
  react-native@0.74.0 - expected version: 0.74.5
  react-native-svg@15.12.1 - expected version: 15.2.0
  @types/react@18.2.66 - expected version: ~18.2.79
  typescript@5.4.5 - expected version: ~5.3.3
Your project may not work correctly until you install the expected versions of the packages.
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▄▄▄ ▀▄▀█▄█ ▄▄▄▄▄ █
█ █   █ ██▄▀ █  █▄█ █   █ █
█ █▄▄▄█ ██▀▄ ▄███▀█ █▄▄▄█ █
█▄▄▄▄▄▄▄█ ▀▄█ ▀▄▀ █▄▄▄▄▄▄▄█
█  ▀  █▄▀█▄▀█▄▀█▀ █▄█▀█▀▀▄█
███ █▀▀▄▄ ▄██▄▄▄ ▀▀███▄▀▀ █
█▀  █▀█▄██▄ █▀█▄ █ ▄▀▀█▀ ██
█ ▄▄█▄█▄▄█ ▀█▀▄▀ ▄▀ ██▄▀  █
█▄███▄▄▄█▀█▀ ▄▄ █ ▄▄▄  ▄▀▄█
█ ▄▄▄▄▄ ██ ▀▀▄  █ █▄█ ███ █
█ █   █ █ ▄▀▄ ▀█▄ ▄  ▄ █▀▀█
█ █▄▄▄█ █▀█  ▀█▄ ▄█▀▀▄█   █
█▄▄▄▄▄▄▄█▄▄▄▄██▄▄▄▄█▄▄███▄█

› Metro waiting on exp://192.168.2.231:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Using Expo Go
› Press s │ switch to development build

› Press a │ open Android
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor

› Press ? │ show all commands

Logs for your project will appear below. Press Ctrl+C to exit.
Unable to resolve asset "./assets/icon.png" from "icon" in your app.json or app.config.js
 ERROR  Project is incompatible with this version of Expo Go

• The installed version of Expo Go is for SDK 53.0.0.
• The project you opened uses SDK 51.

How to fix this error:

Either upgrade this project to SDK 53.0.0, or launch it in an iOS simulator. It is not possible to install an older version of Expo Go for iOS devices, only the latest version is supported.

[Learn how to upgrade to SDK 53.](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)

[https://expo.dev/go?sdkVersion=51&platform=ios&device=false](Learn how to install Expo Go for SDK 51 in an iOS Simulator.)
› Stopped server
➜  twins git:(main) ✗ npm install expo@^53.0.0

added 44 packages, removed 234 packages, changed 58 packages, and audited 1043 packages in 14s

95 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
➜  twins git:(main) ✗ npx expo install
› Installing using npm
> npm install

up to date, audited 1043 packages in 3s

95 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
➜  twins git:(main) ✗
➜  twins git:(main) ✗ npx expo-doctor
Need to install the following packages:
expo-doctor@1.17.2
Ok to proceed? (y) y

11/17 checks passed. 6 checks failed. Possible issues detected:
Use the --verbose flag to see more details about passed checks.

✖ Check for common project setup issues
The .expo directory is not ignored by Git. It contains machine-specific device history and development server settings and should not be committed.
Advice:
Add ".expo/" to your .gitignore to avoid committing local Expo state.

✖ Check Expo config (app.json/ app.config.js) schema
Error validating asset fields in /home/nhat/Documents/GitHub/twins/app.json:
 Field: Android.adaptiveIcon.foregroundImage - cannot access file at './assets/adaptive-icon.png'.
 Field: Splash.image - cannot access file at './assets/splash.png'.
 Field: icon - cannot access file at './assets/icon.png'.
Advice:
Resolve schema errors in your app config. Learn more: https://docs.expo.dev/workflow/configuration/

✖ Check dependencies for packages that should not be installed directly
The package  "@types/react-native" should not be installed directly in your project, as types are included with the "react-native" package.
Advice:
Remove these packages from your package.json.

✖ Check that required peer dependencies are installed
Missing peer dependency: @react-native-async-storage/async-storage
Required by: @tensorflow/tfjs-react-native
Missing peer dependency: expo-camera
Required by: @tensorflow/tfjs-react-native
Missing peer dependency: expo-gl
Required by: @tensorflow/tfjs-react-native
Advice:
Install missing required peer dependencies with "npx expo install @react-native-async-storage/async-storage expo-camera expo-gl"
Your app may crash outside of Expo Go without these dependencies. Native module peer dependencies must be installed directly.

✖ Check that native modules use compatible support package versions for installed Expo SDK
Expected package metro@^0.82.0
Found invalid:
  metro@0.80.12
  (for more info, run: npm why metro)
Expected package metro-resolver@^0.82.0
Found invalid:
  metro-resolver@0.80.12
  (for more info, run: npm why metro-resolver)
Expected package metro-config@^0.82.0
Found invalid:
  metro-config@0.80.12
  (for more info, run: npm why metro-config)
Advice:
Upgrade dependencies that are using the invalid package versions.

✖ Check that packages match versions required by installed Expo SDK
The following packages should be updated for best compatibility with the installed expo version:
  expo@53.0.20 - expected version: 53.0.22
  expo-font@12.0.10 - expected version: ~13.3.2
  expo-status-bar@1.12.1 - expected version: ~2.2.3
  react@18.2.0 - expected version: 19.0.0
  react-native@0.74.0 - expected version: 0.79.5
  react-native-gesture-handler@2.16.2 - expected version: ~2.24.0
  react-native-reanimated@3.10.1 - expected version: ~3.17.4
  react-native-safe-area-context@4.10.5 - expected version: 5.4.0
  react-native-screens@3.31.1 - expected version: ~4.11.1
  react-native-svg@15.12.1 - expected version: 15.11.2
  @types/react@18.2.66 - expected version: ~19.0.10
  typescript@5.4.5 - expected version: ~5.8.3
Your project may not work correctly until you install the expected versions of the packages.
Found outdated dependencies
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
To ignore specific packages, add them to "expo.install.exclude" in package.json. Learn more: https://expo.fyi/dependency-validation

6 checks failed, indicating possible issues with the project.
➜  twins git:(main) ✗ npx expo install --check
The following packages should be updated for best compatibility with the installed expo version:
  expo@53.0.20 - expected version: 53.0.22
  expo-font@12.0.10 - expected version: ~13.3.2
  expo-status-bar@1.12.1 - expected version: ~2.2.3
  react@18.2.0 - expected version: 19.0.0
  react-native@0.74.0 - expected version: 0.79.5
  react-native-gesture-handler@2.16.2 - expected version: ~2.24.0
  react-native-reanimated@3.10.1 - expected version: ~3.17.4
  react-native-safe-area-context@4.10.5 - expected version: 5.4.0
  react-native-screens@3.31.1 - expected version: ~4.11.1
  react-native-svg@15.12.1 - expected version: 15.11.2
  @types/react@18.2.66 - expected version: ~19.0.10
  typescript@5.4.5 - expected version: ~5.8.3
Your project may not work correctly until you install the expected versions of the packages.
✔ Fix dependencies? … yes
› Installing 12 SDK 53.0.0 compatible native modules using npm
> npm install

added 1 package, changed 8 packages, and audited 1044 packages in 9s

95 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
› Running npx expo install under the updated expo version
> expo install --fix
The following packages should be updated for best compatibility with the installed expo version:
  expo-font@12.0.10 - expected version: ~13.3.2
  expo-status-bar@1.12.1 - expected version: ~2.2.3
  react@18.2.0 - expected version: 19.0.0
  react-native@0.74.0 - expected version: 0.79.5
  react-native-gesture-handler@2.16.2 - expected version: ~2.24.0
  react-native-reanimated@3.10.1 - expected version: ~3.17.4
  react-native-safe-area-context@4.10.5 - expected version: 5.4.0
  react-native-screens@3.31.1 - expected version: ~4.11.1
  react-native-svg@15.12.1 - expected version: 15.11.2
  @types/react@18.2.66 - expected version: ~19.0.10
  typescript@5.4.5 - expected version: ~5.8.3
Your project may not work correctly until you install the expected versions of the packages.
› Installing 11 SDK 53.0.0 compatible native modules using npm
> npm install
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: twins-app@0.1.0
npm warn Found: react@18.2.0
npm warn node_modules/react
npm warn   react@"19.0.0" from the root project
npm warn   22 more (@expo/vector-icons, @react-navigation/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"18.2.0" from react-native@0.74.0
npm warn node_modules/react-native
npm warn   react-native@"0.79.5" from the root project
npm warn   20 more (@expo/vector-icons, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: twins-app@0.1.0
npm warn Found: react@18.2.0
npm warn node_modules/react
npm warn   react@"19.0.0" from the root project
npm warn   22 more (@expo/vector-icons, @react-navigation/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"18.2.0" from react-native@0.74.0
npm warn node_modules/react-native
npm warn   react-native@"0.79.5" from the root project
npm warn   20 more (@expo/vector-icons, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: twins-app@0.1.0
npm warn Found: react@18.2.0
npm warn node_modules/react
npm warn   react@"19.0.0" from the root project
npm warn   22 more (@expo/vector-icons, @react-navigation/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"18.2.0" from react-native@0.74.0
npm warn node_modules/react-native
npm warn   react-native@"0.79.5" from the root project
npm warn   20 more (@expo/vector-icons, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: twins-app@0.1.0
npm warn Found: react@18.2.0
npm warn node_modules/react
npm warn   react@"19.0.0" from the root project
npm warn   22 more (@expo/vector-icons, @react-navigation/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"18.2.0" from react-native@0.74.0
npm warn node_modules/react-native
npm warn   react-native@"0.79.5" from the root project
npm warn   20 more (@expo/vector-icons, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: twins-app@0.1.0
npm warn Found: react@18.2.0
npm warn node_modules/react
npm warn   react@"19.0.0" from the root project
npm warn   22 more (@expo/vector-icons, @react-navigation/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"18.2.0" from react-native@0.74.0
npm warn node_modules/react-native
npm warn   react-native@"0.79.5" from the root project
npm warn   20 more (@expo/vector-icons, ...)
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: twins-app@0.1.0
npm warn Found: react@18.2.0
npm warn node_modules/react
npm warn   react@"19.0.0" from the root project
npm warn   22 more (@expo/vector-icons, @react-navigation/core, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer react@"18.2.0" from react-native@0.74.0
npm warn node_modules/react-native
npm warn   react-native@"0.79.5" from the root project
npm warn   20 more (@expo/vector-icons, ...)
npm warn ERESOLVE overriding peer dependency
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: react-native@0.79.5
npm error Found: @types/react@18.2.66
npm error node_modules/@types/react
npm error   peerOptional @types/react@"^19.0.0" from @react-native/virtualized-lists@0.79.5
npm error   node_modules/react-native/node_modules/@react-native/virtualized-lists
npm error     @react-native/virtualized-lists@"0.79.5" from react-native@0.79.5
npm error     node_modules/react-native
npm error       react-native@"0.79.5" from the root project
npm error       21 more (@react-native-async-storage/async-storage, ...)
npm error
npm error Could not resolve dependency:
npm error peerOptional @types/react@"^19.0.0" from react-native@0.79.5
npm error node_modules/react-native
npm error   react-native@"0.79.5" from the root project
npm error   peer react-native@"^0.0.0-0 || >=0.60 <1.0" from @react-native-async-storage/async-storage@1.24.0
npm error   node_modules/@react-native-async-storage/async-storage
npm error     peer @react-native-async-storage/async-storage@"^1.13.0" from @tensorflow/tfjs-react-native@1.0.0
npm error     node_modules/@tensorflow/tfjs-react-native
npm error       @tensorflow/tfjs-react-native@"^1.0.0" from the root project
npm error   20 more (@react-navigation/native, @react-navigation/stack, ...)
npm error
npm error Conflicting peer dependency: @types/react@19.1.12
npm error node_modules/@types/react
npm error   peerOptional @types/react@"^19.0.0" from react-native@0.79.5
npm error   node_modules/react-native
npm error     react-native@"0.79.5" from the root project
npm error     peer react-native@"^0.0.0-0 || >=0.60 <1.0" from @react-native-async-storage/async-storage@1.24.0
npm error     node_modules/@react-native-async-storage/async-storage
npm error       peer @react-native-async-storage/async-storage@"^1.13.0" from @tensorflow/tfjs-react-native@1.0.0
npm error       node_modules/@tensorflow/tfjs-react-native
npm error         @tensorflow/tfjs-react-native@"^1.0.0" from the root project
npm error     20 more (@react-navigation/native, @react-navigation/stack, ...)
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
npm error to accept an incorrect (and potentially broken) dependency resolution.
npm error
npm error
npm error For a full report see:
npm error /home/nhat/.npm/_logs/2025-08-30T08_41_13_812Z-eresolve-report.txt
npm error A complete log of this run can be found in: /home/nhat/.npm/_logs/2025-08-30T08_41_13_812Z-debug-0.log
Error: npm install exited with non-zero code: 1
Error: npm install exited with non-zero code: 1
    at ChildProcess.completionListener (/home/nhat/Documents/GitHub/twins/node_modules/@expo/spawn-async/build/spawnAsync.js:42:23)
    at Object.onceWrapper (node:events:639:26)
    at ChildProcess.emit (node:events:524:28)
    at maybeClose (node:internal/child_process:1104:16)
    at ChildProcess._handle.onexit (node:internal/child_process:304:5)
    ...
    at spawnAsync (/home/nhat/Documents/GitHub/twins/node_modules/@expo/spawn-async/build/spawnAsync.js:7:23)
    at NpmPackageManager.runAsync (/home/nhat/Documents/GitHub/twins/node_modules/@expo/package-manager/build/node/BasePackageManager.js:41:42)
    at /home/nhat/Documents/GitHub/twins/node_modules/@expo/package-manager/build/node/NpmPackageManager.js:36:20
    at /home/nhat/Documents/GitHub/twins/node_modules/@expo/package-manager/build/utils/spawn.js:14:34
Error: npx expo install --fix exited with non-zero code: 1
Error: npx expo install --fix exited with non-zero code: 1
    at ChildProcess.completionListener (/home/nhat/Documents/GitHub/twins/node_modules/@expo/spawn-async/build/spawnAsync.js:42:23)
    at Object.onceWrapper (node:events:639:26)
    at ChildProcess.emit (node:events:524:28)
    at maybeClose (node:internal/child_process:1104:16)
    at ChildProcess._handle.onexit (node:internal/child_process:304:5)
    ...
    at spawnAsync (/home/nhat/Documents/GitHub/twins/node_modules/@expo/spawn-async/build/spawnAsync.js:7:23)
    at installExpoPackageAsync (/home/nhat/Documents/GitHub/twins/node_modules/@expo/cli/build/src/install/installExpoPackage.js:114:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async fixPackagesAsync (/home/nhat/Documents/GitHub/twins/node_modules/@expo/cli/build/src/install/fixPackages.js:84:9)
    at async installAsync (/home/nhat/Documents/GitHub/twins/node_modules/@expo/cli/build/src/install/installAsync.js:121:16)

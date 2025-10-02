// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "react-native-linkme",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "react-native-linkme",
            targets: ["react-native-linkme"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/r-dev-limited/li-nk.me-ios-sdk.git", from: "0.1.0")
    ],
    targets: [
        .target(
            name: "react-native-linkme",
            dependencies: ["LinkMeKit"],
            path: ".",
            sources: ["ios/**/*.{h,m,mm,swift}"]
        ),
    ]
)

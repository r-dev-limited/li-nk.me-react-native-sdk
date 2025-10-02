Pod::Spec.new do |s|
  s.name         = "react-native-linkme"
  s.version      = "0.1.0"
  s.summary      = "React Native bindings for LinkMe iOS SDK"
  s.license      = { :type => "MIT" }
  s.author       = { "LinkMe" => "support@li-nk.me" }
  s.homepage     = "https://li-nk.me"
  s.source       = { :path => "." }

  s.platforms = { :ios => "13.0" }
  s.swift_version = "5.9"

  s.source_files = [
    "ios/**/*.{h,m,mm,swift}"
  ]

  s.dependency "React"
  s.dependency "LinkMeKit", :path => "../iOS/LinkMeKit"
end

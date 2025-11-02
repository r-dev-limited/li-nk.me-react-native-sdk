import Foundation
import LinkMeKit

@objc(LinkMeURLHandler)
public class LinkMeURLHandler: NSObject {
  private static var storedConfig: LinkMe.Config?
  private static let configKey = "LinkMeConfig"

  @objc(configureIfNeeded)
  public static func configureIfNeeded() {
    if storedConfig != nil {
      return
    }
    guard let plistConfig = Bundle.main.object(forInfoDictionaryKey: configKey) as? [String: Any],
          let config = makeConfig(from: plistConfig) else {
      NSLog("[LinkMeURLHandler] Missing or invalid LinkMeConfig in Info.plist")
      return
    }
    apply(config: config)
  }

  @objc(applyConfig:)
  public static func applyConfig(_ dictionary: NSDictionary) {
    guard let config = makeConfig(from: dictionary as? [String: Any]) else {
      NSLog("[LinkMeURLHandler] Failed to apply runtime config: %@", dictionary)
      return
    }
    apply(config: config)
  }

  @objc(handleURL:)
  @discardableResult
  public static func handleURL(_ url: URL) -> Bool {
    configureIfNeeded()
    guard let _ = storedConfig else {
      NSLog("[LinkMeURLHandler] handleURL before configuration: %@", url.absoluteString)
      return false
    }
    NSLog("[LinkMeURLHandler] handleURL: %@", url.absoluteString)
    let handled = LinkMe.shared.handle(url: url)
    NSLog("[LinkMeURLHandler] LinkMe handled: %d", handled)
    return handled
  }

  @objc(handleUserActivity:)
  @discardableResult
  public static func handleUserActivity(_ userActivity: NSUserActivity) -> Bool {
    configureIfNeeded()
    guard let _ = storedConfig else {
      NSLog("[LinkMeURLHandler] handleUserActivity before configuration: %@", userActivity.webpageURL?.absoluteString ?? "nil")
      return false
    }
    NSLog("[LinkMeURLHandler] handleUserActivity: %@", userActivity.webpageURL?.absoluteString ?? "nil")
    let handled = LinkMe.shared.handle(userActivity: userActivity)
    NSLog("[LinkMeURLHandler] LinkMe handled: %d", handled)
    return handled
  }

  private static func apply(config: LinkMe.Config) {
    storedConfig = config
    LinkMe.shared.configure(config: config)
  }

  private static func makeConfig(from dictionary: [String: Any]?) -> LinkMe.Config? {
    guard let dictionary = dictionary,
          let baseUrlString = dictionary["baseUrl"] as? String,
          let baseUrl = URL(string: baseUrlString) else {
      return nil
    }

    let appId = dictionary["appId"] as? String
    let appKey = dictionary["appKey"] as? String
    let enablePasteboard = dictionary["enablePasteboard"] as? Bool ?? false
    let sendDeviceInfo = dictionary["sendDeviceInfo"] as? Bool ?? true
    let includeVendorId = dictionary["includeVendorId"] as? Bool ?? true
    let includeAdvertisingId = dictionary["includeAdvertisingId"] as? Bool ?? false

    return LinkMe.Config(
      baseUrl: baseUrl,
      appId: appId,
      appKey: appKey,
      enablePasteboard: enablePasteboard,
      sendDeviceInfo: sendDeviceInfo,
      includeVendorId: includeVendorId,
      includeAdvertisingId: includeAdvertisingId
    )
  }
}


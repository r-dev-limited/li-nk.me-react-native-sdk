import Foundation
import React
import LinkMeKit

@objc(LinkMeModule)
class LinkMeModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func configure(_ config: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let baseUrlString = config["baseUrl"] as? String,
          let baseUrl = URL(string: baseUrlString) else {
      rejecter("INVALID_ARGS", "baseUrl is required", nil)
      return
    }
    
    let linkMeConfig = LinkMe.Config(
      baseUrl: baseUrl,
      appId: config["appId"] as? String,
      appKey: config["appKey"] as? String,
      enablePasteboard: config["enablePasteboard"] as? Bool ?? false,
      sendDeviceInfo: config["sendDeviceInfo"] as? Bool ?? true,
      includeVendorId: config["includeVendorId"] as? Bool ?? true,
      includeAdvertisingId: config["includeAdvertisingId"] as? Bool ?? false
    )
    
    LinkMe.shared.configure(config: linkMeConfig)
    resolver(nil)
  }
  
  @objc
  func getInitialLink(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.getInitialLink { payload in
      DispatchQueue.main.async {
        resolver(self.dictionary(from: payload))
      }
    }
  }
  
  @objc
  func claimDeferredIfAvailable(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.claimDeferredIfAvailable { payload in
      DispatchQueue.main.async {
        resolver(self.dictionary(from: payload))
      }
    }
  }
  
  @objc
  func setUserId(_ userId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.setUserId(userId)
    resolver(nil)
  }
  
  @objc
  func setAdvertisingConsent(_ granted: Bool, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.setAdvertisingConsent(granted)
    resolver(nil)
  }
  
  @objc
  func track(_ event: String, properties: NSDictionary?, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let props = properties as? [String: Any]
    LinkMe.shared.track(event: event, props: props)
    resolver(nil)
  }
  
  @objc
  func setReady(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    LinkMe.shared.setReady()
    resolver(nil)
  }
  
  @objc
  func handleUrl(_ url: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: url) else {
      rejecter("INVALID_URL", "Invalid URL format", nil)
      return
    }
    let handled = LinkMe.shared.handle(url: url)
    resolver(handled)
  }
  
  private func dictionary(from payload: LinkPayload?) -> [String: Any]? {
    guard let payload else { return nil }
    var dict: [String: Any] = [:]
    if let linkId = payload.linkId { dict["linkId"] = linkId }
    if let path = payload.path { dict["path"] = path }
    if let params = payload.params { dict["params"] = params }
    if let utm = payload.utm { dict["utm"] = utm }
    if let custom = payload.custom { dict["custom"] = custom }
    return dict
  }
}

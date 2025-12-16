module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.linkme.rn.LinkMeInstallReferrerPackage;',
        packageInstance: 'new LinkMeInstallReferrerPackage()',
      },
    },
  },
};


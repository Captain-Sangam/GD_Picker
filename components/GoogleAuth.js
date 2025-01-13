"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { useState, useCallback, useEffect } from "react";

export default function GoogleAuth() {
  const [user, setUser] = useState(null);
  const [pickerInited, setPickerInited] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    const loadGoogleApis = () => {
      const script1 = document.createElement("script");
      script1.src = "https://apis.google.com/js/api.js";
      script1.onload = () => {
        window.gapi.load("picker", () => {
          setPickerInited(true);
        });
      };
      document.body.appendChild(script1);

      const script2 = document.createElement("script");
      script2.src = "https://accounts.google.com/gsi/client";
      document.body.appendChild(script2);
    };

    loadGoogleApis();
  }, []);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      setUser(response);
    },
    scope: "https://www.googleapis.com/auth/drive.file",
  });

  const showPicker = useCallback(() => {
    if (!user || !pickerInited) return;

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .addView(
        new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
          .setMimeTypes(
            "application/vnd.google-apps.folder,application/vnd.google-apps.document"
          )
      )
      .setOAuthToken(user.access_token)
      .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const items = data.docs;
          // Filter out folders and store only files
          const files = items.filter(
            (item) => !item.mimeType.includes("folder")
          );
          setSelectedItems(files);

          // Log only the files for clarity
          console.log(
            "Selected files:",
            files.map((file) => ({
              name: file.name,
              id: file.id,
              size: file.sizeBytes
                ? `${(file.sizeBytes / 1024).toFixed(2)} KB`
                : "N/A",
            }))
          );
        }
      })
      .build();

    picker.setVisible(true);
  }, [user, pickerInited]);

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                {!user ? (
                  <button
                    onClick={() => login()}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Sign in with Google
                  </button>
                ) : (
                  <>
                    <button
                      onClick={showPicker}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Open Drive Picker
                    </button>
                    {selectedItems.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-bold mb-2">
                          Selected Files ({selectedItems.length})
                        </h3>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                          {selectedItems.map((item, index) => (
                            <div
                              key={item.id}
                              className="p-3 bg-gray-50 rounded flex justify-between items-center"
                            >
                              <span className="text-sm">
                                {index + 1}. {item.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

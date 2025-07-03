"use client";

import { useState, useCallback, useEffect } from "react";

export default function GoogleAuth() {
  const [user, setUser] = useState(null);
  const [pickerInited, setPickerInited] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [gisInited, setGisInited] = useState(false);

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
      script2.onload = () => {
        window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive',
          callback: (tokenResponse) => {
            setUser(tokenResponse);
          },
        });
        setGisInited(true);
      };
      document.body.appendChild(script2);
    };

    loadGoogleApis();
  }, []);

  const login = () => {
    if (!gisInited) return;
    
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive',
      callback: (tokenResponse) => {
        setUser(tokenResponse);
      },
    });
    
    tokenClient.requestAccessToken();
  };

  // Function to fetch owner information for a file/folder
  const fetchOwnerInfo = async (fileId, accessToken) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=owners`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.owners?.[0]?.emailAddress || await getCurrentUserEmail(accessToken);
      }
    } catch (error) {
      console.error('Error fetching owner info:', error);
    }
    return await getCurrentUserEmail(accessToken);
  };

  // Function to get the current authenticated user's email
  const getCurrentUserEmail = async (accessToken) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.email || "Unknown Owner";
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
    return "Unknown Owner";
  };

  const showPicker = useCallback(() => {
    if (!user || !pickerInited) return;

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
      .addView(
        new window.google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
          .setMimeTypes(
            "application/vnd.google-apps.folder,application/vnd.google-apps.document"
          )
      )
      .addView(new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setEnableDrives(true)
        .setMimeTypes(
          "application/vnd.google-apps.folder,application/vnd.google-apps.document"
        )
      )
      .setOAuthToken(user.access_token)
      .setCallback(async (data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const newItems = data.docs;
          
          // Fetch owner information for each item
          const itemsWithOwners = await Promise.all(
            newItems.map(async (item) => {
              const owner = await fetchOwnerInfo(item.id, user.access_token);
              return {
                ...item,
                owner: owner
              };
            })
          );
          
          // Merge new selections with existing ones
          setSelectedItems(prevItems => {
            // Create a map of existing items by ID
            const existingItemsMap = new Map(
              prevItems.map(item => [item.id, item])
            );
            
            // Add new items if they don't exist
            itemsWithOwners.forEach(item => {
              if (!existingItemsMap.has(item.id)) {
                existingItemsMap.set(item.id, item);
              }
            });
            
            // Convert map back to array
            return Array.from(existingItemsMap.values());
          });

          console.log(
            "Selected items:",
            itemsWithOwners.map((item) => ({
              name: item.name,
              id: item.id,
              type: item.mimeType.includes("folder") ? "Folder" : "File",
              owner: item.owner,
            }))
          );
        }
      })
      .build();

    picker.setVisible(true);
  }, [user, pickerInited]);

  const removeItem = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

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
                          Selected Items ({selectedItems.length})
                        </h3>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                          {selectedItems.map((item, index) => (
                            <div
                              key={item.id}
                              className="p-3 bg-gray-50 rounded flex justify-between items-center"
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium">
                                  {index + 1}. {item.name}
                                  {item.mimeType.includes("folder") && " "}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Owner: {item.owner}
                                </div>
                              </div>
                              {item.mimeType.includes("folder") && (
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="ml-2 text-gray-500 hover:text-red-500"
                                >
                                  ✕
                                </button>
                              )}
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
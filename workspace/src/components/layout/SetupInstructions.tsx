
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Terminal, KeyRound } from "lucide-react";
import Logo from "./Logo";

const CodeBlock = ({ children }: { children: React.ReactNode }) => (
    <pre className="mt-2 rounded-md bg-muted p-4 text-sm text-muted-foreground overflow-x-auto">
        <code>
            {children}
        </code>
    </pre>
);

export default function SetupInstructions() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="max-w-3xl w-full mx-auto">
        <div className="text-center mb-8">
            <Logo />
        </div>
        <Card className="bg-card border-destructive shadow-2xl glow-edge-primary">
          <CardHeader>
            <div className="flex items-center gap-4">
              <AlertCircle className="h-10 w-10 text-destructive shrink-0" />
              <div>
                <CardTitle className="text-2xl font-headline text-destructive">
                  Final Setup Step Required
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your application is missing its required API keys to connect to Firebase.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-base">
            <p>
              To get the app running, you just need to provide your unique Firebase and Google AI keys.
            </p>
            
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><Terminal/>Step 1: Find your Environment File</h3>
              <p className="text-muted-foreground">
                In your project's file explorer, find the file named <code className="bg-muted px-1.5 py-0.5 rounded text-sm">.env</code>. If it does not exist, create it by copying from <code className="bg-muted px-1.5 py-0.5 rounded text-sm">.env.example</code>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><KeyRound/>Step 2: Add Your Keys to `.env`</h3>
              <p className="text-muted-foreground mb-2">
                Now, you just need to get the values for the variables inside your <code className="bg-muted px-1.5 py-0.5 rounded text-sm">.env</code> file.
              </p>
              
              <div className="pl-4 border-l-2 border-border space-y-4">
                  <div>
                    <h4 className="font-medium text-primary">A) Get Your Firebase Keys</h4>
                    <p className="text-muted-foreground text-sm">
                      Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Firebase Console</a>, select your project (<code className="text-xs">zilacart-6a1a8</code>), go to <b className="text-foreground">Project Settings</b> (⚙️ icon), and find your web app config. Copy the values into the matching <code className="text-xs">NEXT_PUBLIC_...</code> variables in your <code className="text-xs">.env</code> file.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-primary">B) Get Your Google AI Key</h4>
                    <p className="text-muted-foreground text-sm">
                      Go to the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Google AI Studio</a>, create a new API key, and paste it as the value for <code className="text-xs">GOOGLE_API_KEY</code>.
                    </p>
                  </div>
              </div>
            </div>

            <div>
                 <h3 className="font-semibold text-lg mb-2">Step 3: Restart the Application</h3>
                 <p className="text-muted-foreground">
                    After adding all the keys to your <code className="bg-muted px-1.5 py-0.5 rounded text-sm">.env</code> file, **you must restart the development server** for the changes to take effect.
                 </p>
            </div>
            
             <p className="text-center text-sm text-muted-foreground pt-4">
                Full, detailed instructions can also be found in the <code className="bg-muted px-1.5 py-0.5 rounded text-sm">README.md</code> file.
             </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Mail, Lock, ArrowRight, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast({ title: "Erreur d'inscription", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Compte créé", description: "Vous êtes maintenant connecté." });
          navigate("/");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
        } else {
          navigate("/");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
<div
  className="h-screen w-full flex items-center justify-center overflow-hidden"
  
  style={{
    backgroundImage: "url('/background2.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(0px)"
  }}
>
      {/* Gauche - Branding */}
    
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary"
              style={{
                width: Math.random() * 300 + 50,
                height: Math.random() * 300 + 50,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.3,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center px-12"
        >
       <div className="flex items-center justify-center mx-auto mb-6">
  <motion.img
  src="/my-logo.png"
  alt="logo"
  className="w-28 h-28 object-contain mx-auto mb-6 drop-shadow-lg cursor-pointer"
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  whileHover={{ scale: 1.1, rotate: 2 }}
  transition={{ duration: 0.8 }}
/>
</div>
<motion.h1
  className="text-5xl font-extrabold mb-3 text-white/90 tracking-wide"
  initial={{ opacity: 0, x: -50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 1.7, ease: [0.25, 1, 0.5, 1] }}
>
  PetroView
</motion.h1>

<motion.p
  className="text-gray-300 text-lg"
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.4, duration: 0.6 }}
>
  Plateforme de visualisation de cartographie des puits Pétrolières
</motion.p>
<motion.p
  className="text-gray-300 text-sm mt-2 max-w-md"
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.7, duration: 0.6 }}
>
  Gérez vos puits, visualisez les données pétrophysiques et lancez des analyses — tout en un seul endroit.
</motion.p>
        </motion.div>
      

      {/* Droite - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-sm bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-xl border border-white/20"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
          <img
  src="/my-logo.png"
  alt="logo"
  className="w-10 h-10 object-contain"
/>
            <h1 className="text-2xl font-bold text-foreground">PetroView</h1>
          </div>

          <h2 className="text-2xl font-bold text-black">
            {isSignUp ? "Créer un compte" : "Bon retour"}
          </h2>
          <p className="text-black mt-1 mb-8">
            {isSignUp ? "Inscrivez-vous pour commencer" : "Connectez-vous à votre compte"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label>Nom d'affichage</Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Votre nom"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="vous@entreprise.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                <>
                  {isSignUp ? "S'inscrire" : "Se Connecter"} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

    
        </motion.div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

const searchTorrents = async (searchTerm) => {
  const response = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${searchTerm}&limit=50`)
  const json = await response.json()
  return json.data
}

const socket = new WebSocket('ws://192.168.86.93:3080');

socket.addEventListener('open', function (event) {
    socket.send('Hello Server!');
});

// socket.addEventListener('message', function (event) {
//     console.log('Message from server ', event.data);
// });

const getFakeStatus = () =>{
  return Math.random()*1000
}

const getTorrent = async (torrent, torrentTitle) => {
  const torrentUrl = encodeURIComponent(torrent.url)
  const title = encodeURIComponent(torrentTitle)
  console.log(title)
  const response = await fetch(`/download?url=${torrentUrl}&title=${title}`)
  const json = await response.json()
  console.log(json)
}

const SearchForm = props => {
  const { callback } = props
  const [value, setValue] = useState("");
  
  const handleChange = (event) => {
    setValue(event.target.value)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const torrents = await searchTorrents(value)
    console.log(torrents.movies)
    callback(torrents.movies)
  }

  return (
    <form>
      <input type="text" onChange={handleChange}/>
      <button type="submit" onClick={handleSubmit}>Search</button>
    </form>
  )
}

const MovieQueue = props =>{
  const {movieQueue} = props
  console.log('render queue')
  console.log({queue: movieQueue})
  return (
    <ul className="movieQueue">
      {movieQueue.map((item,index)=>(
        <li key={index}>
          <img src={item.image}/>
          <div>
            <h5>{item.title}</h5>
            <span>{item.type}: {item.quality}</span>
            <span>time: {item.time || 0} status: {item.status||'downloading'}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

const useMovieQueue = () => {
  const [movieQueue, setMovieQueue] = useState([])
  const addMovieToQueue = (movie)=>{
    console.log('adding movie')
    const newMovies = [...movieQueue, movie]
    setMovieQueue(newMovies)
    console.log(movieQueue) 
  }
  const updateStatus = (event) => {
    const data = event.data
    console.log(data)
    console.log(typeof data)
    console.log({data: JSON.parse(data)})
    if(!movieQueue.length) return
    const {hash, time} = JSON.parse(data)
    for(let i =0;i<movieQueue.length;i++){
      console.log({localHash: movieQueue[i].hash, hash: hash.toString().toUpperCase()})
      if(hash && movieQueue[i].hash === hash.toString().toUpperCase()){
        console.log({time: movieQueue[i].time})
        const queueCopy = [...movieQueue]
        queueCopy[i].time = time
        setMovieQueue(queueCopy)
        console.log({time2: movieQueue[i].time})
        break

      }
    }
  }
  useEffect(()=>{
    console.log('effect')
    socket.addEventListener('message', updateStatus);
    return ()=>{
      socket.removeEventListener('message', updateStatus)
    }
  })

  return {addMovieToQueue, movieQueue}
}

const MovieList = props => {
  const {movies, callback} = props
  const {addMovieToQueue} = useMovieQueue()
  const handleClick = (event, item, torrent) => {
    event.preventDefault()
    console.log({torrent: torrent})
    const torrentItem = {...torrent, title: item.title, image: item.small_cover_image, time: 100}
    callback(torrentItem)
    getTorrent(torrent, item.title)
  }
  
  const Movie = props => {
    const {item} = props
    return (
      <li>
        <img src={item.medium_cover_image}/>
        <div>
          <h3>{item.title}</h3>
          <h4>{item.year}</h4>
          {item.torrents && item.torrents.map((torrent,index)=>(
            <a className="torrentButton" href={torrent.url} key={index} onClick={(event)=>handleClick(event, item, torrent)}>{torrent.type + ': ' + torrent.quality}<span>peers: {torrent.peers}</span></a>
          ))}
        </div>
      </li>
    )
  }
  if(movies){
    return (
      <ul className="movieList">
        {movies.map((movie,index) =>(
          <Movie item={movie} key={index} />
        ))}
      </ul>
    )
  }else{
    return (
      <div>No Movies Found</div>
    )
  }
}

function App() {
  const [movies, setMovies] = useState([])
  const {addMovieToQueue, movieQueue} = useMovieQueue()
  console.log(movieQueue)
  return (
    <div className="App">
      <h1>Torrent Friend!</h1>
      <SearchForm callback={setMovies}/>
      <MovieList movies={movies} callback={addMovieToQueue}/>
      <MovieQueue movieQueue={movieQueue}/>
    </div>
  );
}

export default App;
